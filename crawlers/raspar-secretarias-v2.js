/**
 * raspar-secretarias-v2.js
 * 
 * Estratégia 2 etapas:
 *  1. Lista: secretaria.php → coleta todos os links ?sec=N
 *  2. Detalhe: secretaria.php?sec=N → extrai todos os campos incluindo
 *     biografia, cnpj, funcoes (quando disponível)
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const parseArgs = require('util').parseArgs;
const scraperService = require('../legacy_backup/src/services/scraper-service');

require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltam variáveis de ambiente do Supabase (URL ou KEY).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Decodifica e-mails protegidos pelo Cloudflare
function decodeCFEmail(cfemail) {
    if (!cfemail) return '';
    let email = '';
    let r = parseInt(cfemail.substr(0, 2), 16);
    for (let n = 2; cfemail.length - n; n += 2) {
        email += String.fromCharCode(parseInt(cfemail.substr(n, 2), 16) ^ r);
    }
    return email;
}

// Extrai e-mail da página (CloudFlare ou texto direto)
function extractEmail($) {
    const cfEl = $('.__cf_email__').first();
    if (cfEl.length) return decodeCFEmail(cfEl.attr('data-cfemail'));
    const emailMatch = $('body').text().match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    return emailMatch ? emailMatch[0] : null;
}

// Extrai valor de campo textual por prefixo (ex: "CNPJ: ")
function extractField(text, prefix) {
    const regex = new RegExp(`${prefix}[:\\s]+([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

async function fetchPage(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalGovBot/2.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar: ${url}`);
    return res.text();
}

// ── Etapa 1: coleta todos os links ?sec=N da página de listagem ───────────
async function collectSecLinks(urlBase) {
    const html = await fetchPage(`${urlBase}/secretaria.php`);
    const $ = cheerio.load(html);
    const secMap = new Map(); // sec_number → { nome, url }

    $('a[href*="secretaria.php?sec="]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/[?&]sec=(\d+)/);
        if (!match) return;
        const secNum = match[1];
        if (secMap.has(secNum)) return; // dedup
        const nome = $(el).text().trim();
        const url = href.startsWith('http') ? href : `${urlBase}${href.startsWith('/') ? '' : '/'}${href}`;
        secMap.set(secNum, { nome, url });
    });

    return [...secMap.values()];
}

// ── Etapa 2: raspa página de detalhe de uma secretaria ────────────────────
async function scrapeDetail(urlBase, detailUrl) {
    const html = await fetchPage(detailUrl);
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // Nome da secretaria: h1 no conteúdo principal (exclui nav)
    let nome_secretaria = $('h1').not('nav h1').first().text().trim();
    if (!nome_secretaria) {
        // Fallback: maior heading fora do rodapé
        nome_secretaria = $('h2').not('footer h2').first().text().trim();
    }

    // Foto do gestor: primeiro img dentro do card do secretário
    let foto_url = null;
    const imgSrc = $('img[src*="gestor"], img[src*="foto"], img[src*="secretari"]').first().attr('src')
        || $('img[class*="rounded"], img[class*="perfil"]').first().attr('src')
        || $('img').not('[src*="logo"], [src*="icon"], [src*="banner"]').first().attr('src');
    if (imgSrc) {
        foto_url = imgSrc.startsWith('http') ? imgSrc : `${urlBase}${imgSrc.startsWith('/') ? '' : '/'}${imgSrc}`;
    }

    // Nome e cargo do responsável: primeiros h6 do bloco de conteúdo
    const headings = $('main h6, .content h6, #conteudo h6, .container h6').toArray();
    const nome_responsavel = headings[0] ? $(headings[0]).text().trim() : null;
    const cargo_responsavel = headings[1] ? $(headings[1]).text().trim() : null;

    // Biografia completa: texto da modal do gestor atual
    let biografia = null;
    $('h4.modal-title').each((_, el) => {
        const h4Text = $(el).text().trim();
        if (nome_responsavel && h4Text.includes(nome_responsavel.split(' ')[0])) {
            const modalBody = $(el).closest('.modal-content').find('.modal-body');
            const bioDiv = modalBody.find('div[style*="text-align:justify"]');
            if (bioDiv.length) {
                biografia = bioDiv.text().trim();
            } else {
                biografia = modalBody.text().trim().replace(/\s{2,}/g, '\n');
            }
        }
    });

    // Fallback para biografia: parágrafo longo próximo ao nome do responsável
    if (!biografia) {
        $('p').each((_, el) => {
            const txt = $(el).text().trim();
            if (txt.length > 150 && !/copyright|lgpd|cookie/i.test(txt)) {
                biografia = txt;
                return false;
            }
        });
    }

    // CNPJ (Extração robusta)
    let cnpj = extractField(bodyText, 'CNPJ');
    if (!cnpj) {
        const cnpjNode = $('strong:contains("CNPJ")').parent();
        if (cnpjNode.length) cnpj = cnpjNode.text().replace(/CNPJ:/i, '').trim();
    }

    // Telefone
    let telefone = extractField(bodyText, 'Telefone[s]?');
    if (!telefone) {
        const telNode = $('strong:contains("Telefone")').parent();
        if (telNode.length) telefone = telNode.text().replace(/Telefone\(s\):/i, '').trim();
    }

    // E-mail
    const email = extractEmail($);

    // Horário
    let horario_atendimento = extractField(bodyText, 'Horário');
    if (!horario_atendimento) {
        const horNode = $('strong:contains("Horário")').parent();
        if (horNode.length) horario_atendimento = horNode.text().replace(/Horário:/i, '').trim();
    }

    // Endereço
    const endereco = extractField(bodyText, 'Endereço');

    // Funções / Atribuições (HTML)
    let funcoes = null;
    const funcoesNode = $('div.titulo2:contains("Atribuições da Secretaria")').nextUntil('div.titulo2, div.tab-pane, h3, h4');
    if (funcoesNode.length) {
        let funcoesHtml = '';
        funcoesNode.each((i, el) => {
            let html = $(el).html();
            if (html) funcoesHtml += html.trim() + '<br/>';
        });
        funcoes = funcoesHtml.replace(/<br\/>$/, '').trim();
    }

    return {
        nome_secretaria,
        nome_responsavel,
        cargo_responsavel,
        foto_url,
        biografia,
        cnpj,
        telefone,
        email,
        horario_atendimento,
        endereco,
        funcoes,
        url_origem: detailUrl,
    };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function rasparSecretarias() {
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
    const limit         = parseInt(values.limit) || 0;

    if (!municipioId) {
        console.error('❌ Parâmetro --municipio_id é obrigatório.');
        process.exit(1);
    }

    console.log(`\n🚀 [SECRETARIAS v2] Raspando: ${urlBase}/secretaria.php`);

    // ── Etapa 1 ─────────────────────────────────────────────────────────
    const secLinks = await collectSecLinks(urlBase);
    const total = limit > 0 ? Math.min(limit, secLinks.length) : secLinks.length;
    console.log(`ℹ️  Encontradas ${secLinks.length} secretarias. Processando ${total}...\n`);

    let inserted = 0;
    let updated  = 0;
    let errors   = 0;

    for (let i = 0; i < total; i++) {
        const { nome, url } = secLinks[i];
        console.log(`[${i + 1}/${total}] 🔍 ${nome.substring(0, 50)}`);

        try {
            // ── Etapa 2 ──────────────────────────────────────────────
            const detail = await scrapeDetail(urlBase, url);

            // Upload da foto
            let fotoFinal = null;
            if (detail.foto_url) {
                console.log(`      📸 Enviando foto...`);
                const folder = `${municipioNome}/Secretarias`.replace(/ /g, '_');
                fotoFinal = await scraperService.uploadMedia(detail.foto_url, 'arquivos_municipais', folder);
            }

            const record = {
                municipio_id:       municipioId,
                nome_secretaria:    detail.nome_secretaria || nome,
                nome_responsavel:   detail.nome_responsavel,
                cargo_responsavel:  detail.cargo_responsavel,
                email:              detail.email,
                telefone:           detail.telefone,
                horario_atendimento:detail.horario_atendimento,
                endereco:           detail.endereco,
                url_origem:         detail.url_origem,
                foto_url:           fotoFinal,
                biografia:          detail.biografia,
                cnpj:               detail.cnpj,
                funcoes:            detail.funcoes,
                exercicio:          new Date().getFullYear(),
                status:             'rascunho',
            };

            // Upsert por nome_secretaria + municipio_id
            const { data: existing } = await supabase
                .from('tab_secretarias')
                .select('id')
                .eq('municipio_id', municipioId)
                .eq('nome_secretaria', record.nome_secretaria)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('tab_secretarias')
                    .update(record)
                    .eq('id', existing.id);
                if (error) throw error;
                updated++;
                console.log(`      🔄 Atualizado.`);
            } else {
                const { error } = await supabase
                    .from('tab_secretarias')
                    .insert([record]);
                if (error) throw error;
                inserted++;
                console.log(`      ✅ Inserido.`);
            }

            // Respeita o servidor: 500ms entre requisições
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            errors++;
            console.error(`      ❌ Erro: ${err.message}`);
        }
    }

    console.log(`\n🏁 Resultado: ${inserted} inseridos | ${updated} atualizados | ${errors} erros.`);
}

rasparSecretarias();
