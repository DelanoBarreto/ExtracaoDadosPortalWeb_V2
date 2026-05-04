/**
 * raspar-gestores.js
 * 
 * Raspa gestores (prefeitos e vices) do site da prefeitura.
 * - Gestores Atuais: Pegos dos cards com foto.
 * - Histórico: Tabela de gestores passados.
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const parseArgs = require('util').parseArgs;
const scraperService = require('../src/services/scraper-service');

require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltam variáveis de ambiente do Supabase (URL ou KEY).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchPage(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalGovBot/2.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar: ${url}`);
    return res.text();
}

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
    }
    return null;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function rasparGestores() {
    const { values } = parseArgs({
        options: {
            limit:          { type: 'string' },
            municipio_id:   { type: 'string' },
            url_base:       { type: 'string' },
            municipio_nome: { type: 'string' },
        }
    });

    const municipioId   = values.municipio_id;
    const urlBase       = (values.url_base || 'https://aracati.ce.gov.br').replace(/\/$/, '');
    const municipioNome = values.municipio_nome || 'Aracati';
    const limit         = parseInt(values.limit) || 0; // Se houver limite (ex: para testes)

    if (!municipioId) {
        console.error('❌ Parâmetro --municipio_id é obrigatório.');
        process.exit(1);
    }

    const urlGestores = `${urlBase}/gestores.php`;
    console.log(`\n🚀 [GESTORES] Raspando: ${urlGestores}`);

    const html = await fetchPage(urlGestores);
    const $ = cheerio.load(html);

    const gestores = [];

    // 1. Gestores Atuais (com foto)
    console.log(`\n🔍 Extraindo Gestores Atuais...`);
    $('.centralizar-cabecalho').each((_, el) => {
        const $el = $(el);
        const titlePre = $el.find('.titlepre');
        
        let nome = titlePre.find('strong').text().trim();
        let cargo = titlePre.children('p').eq(1).text().trim().toUpperCase();
        
        // Tratar "Prefeito(a)" e "Vice-prefeito(a)"
        if (cargo.includes('VICE')) cargo = 'VICE-PREFEITO(A)';
        else cargo = 'PREFEITO(A)';

        if (!nome) return;

        let imgSrc = $el.find('img').attr('src');
        let foto_url = null;
        if (imgSrc) {
            foto_url = imgSrc.startsWith('http') ? imgSrc : `${urlBase}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`;
        }

        gestores.push({
            nome,
            cargo,
            foto_url,
            is_atual: true,
            data_inicio: null, // Pode ser null, mandato atual
            data_fim: null,
            status: 'rascunho',
            url_origem: urlGestores
        });
    });

    // 2. Gestores Históricos (Tabela)
    console.log(`🔍 Extraindo Histórico de Gestores...`);
    $('table#gestores tbody tr').each((_, el) => {
        const $tds = $(el).find('td');
        if ($tds.length < 4) return;

        const data_inicio_str = $tds.filter('[data-title*="Data inicio"], [data-title*="Data inicio"]').text().trim() || $tds.eq(0).text().trim();
        const data_fim_str = $tds.filter('[data-title*="Data fim"], [data-title*="Data fim"]').text().trim() || $tds.eq(1).text().trim();
        const nome = $tds.filter('[data-title="Nome"]').text().trim() || $tds.eq(2).text().trim();
        let cargo = $tds.filter('[data-title="Cargo"]').text().trim().toUpperCase() || $tds.eq(3).text().trim().toUpperCase();

        if (cargo.includes('VICE')) cargo = 'VICE-PREFEITO(A)';
        else cargo = 'PREFEITO(A)';

        if (!nome) return;

        gestores.push({
            nome,
            cargo,
            foto_url: null, // Históricos geralmente não têm foto na tabela
            is_atual: false,
            data_inicio: parseDate(data_inicio_str),
            data_fim: parseDate(data_fim_str),
            status: 'rascunho',
            url_origem: urlGestores
        });
    });

    const totalToProcess = limit > 0 ? Math.min(limit, gestores.length) : gestores.length;
    console.log(`ℹ️  Encontrados ${gestores.length} gestores. Processando ${totalToProcess}...`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < totalToProcess; i++) {
        const gestor = gestores[i];
        console.log(`[${i + 1}/${totalToProcess}] 👤 ${gestor.nome.substring(0, 40)} (${gestor.cargo}) ${gestor.is_atual ? '[ATUAL]' : '[HISTÓRICO]'}`);

        try {
            // ── Verificação de Duplicidade Preventiva ──────────────────────
            let query = supabase
                .from('tab_gestores')
                .select('id')
                .eq('municipio_id', municipioId)
                .eq('nome', gestor.nome)
                .eq('cargo', gestor.cargo);
            
            // Se for gestor ATUAL, buscamos apenas pelo status is_atual
            // Isso permite que o usuário edite a data de início no dashboard sem gerar duplicidade
            if (gestor.is_atual) {
                query = query.eq('is_atual', true);
            } else {
                // Para históricos, a data ainda é necessária para distinguir mandatos diferentes
                if (gestor.data_inicio) {
                    query = query.eq('data_inicio', gestor.data_inicio);
                } else {
                    query = query.is('data_inicio', null);
                }
            }

            const { data: existing } = await query.maybeSingle();

            if (existing) {
                console.log(`      ⏭️ Já cadastrado. Pulando.`);
                continue;
            }
            // ──────────────────────────────────────────────────────────────

            // Upload de foto se for atual
            let fotoFinal = null;
            if (gestor.foto_url) {
                console.log(`      📸 Enviando foto...`);
                const folder = `${municipioNome}/Gestores`.replace(/ /g, '_');
                fotoFinal = await scraperService.uploadMedia(gestor.foto_url, 'arquivos_municipais', folder);
            }

            const record = {
                municipio_id: municipioId,
                nome: gestor.nome,
                cargo: gestor.cargo,
                data_inicio: gestor.data_inicio,
                data_fim: gestor.data_fim,
                foto_url: fotoFinal,
                is_atual: gestor.is_atual,
                exercicio: new Date().getFullYear(),
                status: gestor.status,
                url_origem: gestor.url_origem,
            };

            // Insere novo registro
            const { error } = await supabase
                .from('tab_gestores')
                .insert([record]);
            
            if (error) throw error;
            inserted++;
            console.log(`      ✅ Inserido.`);

        } catch (err) {
            errors++;
            console.error(`      ❌ Erro: ${err.message}`);
        }
    }

    console.log(`\n🏁 Resultado: ${inserted} inseridos | ${updated} atualizados | ${errors} erros.`);
}

rasparGestores();
