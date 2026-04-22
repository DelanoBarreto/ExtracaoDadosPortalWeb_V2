const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const parseArgs = require('util').parseArgs;
const axios = require('axios');
const fs = require('fs');
const scraperService = require('./src/services/scraper-service');

// Carrega variáveis do .env da raiz
require('dotenv').config({ path: __dirname + '/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Faltam variáveis de ambiente do Supabase (URL ou KEY).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function decodeCFEmail(cfemail) {
    if (!cfemail) return '';
    let email = "";
    let r = parseInt(cfemail.substr(0, 2), 16);
    for (let n = 2; cfemail.length - n; n += 2) {
        let i = parseInt(cfemail.substr(n, 2), 16) ^ r;
        email += String.fromCharCode(i);
    }
    return email;
}

async function rasparSecretarias() {
    const { values } = parseArgs({
        options: {
            limit: { type: 'string' },
            municipio_id: { type: 'string' },
            url_base: { type: 'string' },
            municipio_nome: { type: 'string' }
        }
    });

    const municipioId = values.municipio_id;
    const urlBase = values.url_base ? values.url_base.replace(/\/$/, '') : 'https://aracati.ce.gov.br';
    const limit = parseInt(values.limit) || 20;

    let targetUrl = `${urlBase}/secretaria.php`;

    console.log(`\n🚀 [SECRETARIAS] Raspando: ${targetUrl}`);

    try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const html = await res.text();
        const $ = cheerio.load(html);

        // As secretarias estão dentro de divs que contém um 'h6' com o nome e geralmente um ícone 'bi-envelope' ou 'bi-telephone'.
        const cards = $('h6').parent('div').filter((_, el) => {
            return $(el).find('h6').length >= 2 && $(el).text().includes('Atendimento') || $(el).text().toLowerCase().includes('secretaria');
        }).toArray();

        console.log(`ℹ️ Foram encontrados ${cards.length} blocos de secretarias.`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < cards.length; i++) {
            if (limit > 0 && i >= limit && limit !== 0) break;
            
            const card = $(cards[i]);
            
            const nome_secretaria = card.find('h6:first-of-type strong').text().trim() || card.find('h6:first-of-type').text().trim();
            const nome_responsavel = card.find('h6:nth-of-type(2)').text().replace('+', '').trim() || null;
            const cargo_responsavel = card.find('h6:nth-of-type(2)').next('p').text().trim() || null;
            
            // Decodes cloudflare email
            let email = '';
            const cfEmailEl = card.find('.__cf_email__');
            if (cfEmailEl.length > 0) {
                email = decodeCFEmail(cfEmailEl.attr('data-cfemail'));
            } else {
                email = card.find('.bi-envelope-at-fill').parent().text().trim() || null;
            }

            const telefone = card.find('.bi-telephone-fill').parent().text().trim() || null;
            const horario_atendimento = card.find('.bi-clock').parent().text().trim() || null;
            const endereco = card.find('.bi-geo-alt-fill').parent().text().trim() || null;
            
            // Foto do Gestor
            const photoSrc = card.parent().find('img').attr('src') || card.find('img').attr('src') || card.closest('.row').find('img').attr('src');
            let fotoUrlOrigem = null;
            if (photoSrc) {
                fotoUrlOrigem = photoSrc.startsWith('http') ? photoSrc : `${urlBase}${photoSrc.startsWith('/') ? '' : '/'}${photoSrc}`;
            }
            
            // Corrige se a URL extraída for relativa
            let url_origem = card.find('a[href*="secretaria.php?sec="]').attr('href') || null;
            if (url_origem && url_origem.startsWith('/')) {
                url_origem = urlBase + url_origem;
            }

            if (!nome_secretaria) continue;

            // Insere no Supabase usando upsert na url_origem (se houver url), ou insere diretamente
            // Devido a não termos garantido unique no url_origem do SQL original, usaremos select para checar
            
            let query = supabase.from('tab_secretarias').select('id').eq('municipio_id', municipioId).eq('nome_secretaria', nome_secretaria);
            if (url_origem) query = query.eq('url_origem', url_origem);
            
            const { data: existing } = await query.single();

            let isNew = !existing;
            let foto_url = null;
            
            if (fotoUrlOrigem) {
                // Upload para o Storage
                const folderName = `${values.municipio_nome || 'Aracati'}/Secretarias`.replace(/ /g, '_');
                console.log(`      📸 Baixando foto do gestor de: ${nome_secretaria}`);
                foto_url = await scraperService.uploadMedia(fotoUrlOrigem, 'arquivos_municipais', folderName);
            }

            const record = {
                municipio_id: municipioId,
                nome_secretaria,
                nome_responsavel,
                cargo_responsavel,
                email,
                telefone,
                horario_atendimento,
                endereco,
                url_origem,
                foto_url,
                exercicio: new Date().getFullYear(),
                status: 'rascunho'
            };

            if (existing) {
                const { error } = await supabase.from('tab_secretarias').update(record).eq('id', existing.id);
                if (error) {
                    console.error(`❌ Erro ao atualizar ${nome_secretaria}: ${error.message}`);
                } else {
                    skippedCount++;
                    console.log(`🔄 Atualizado: ${nome_secretaria.substring(0, 30)}...`);
                }
            } else {
                const { error } = await supabase.from('tab_secretarias').insert([record]);
                if (error) {
                    console.error(`❌ Erro ao inserir ${nome_secretaria}: ${error.message}`);
                } else {
                    insertedCount++;
                    console.log(`✅ Inserido: ${nome_secretaria.substring(0, 30)}...`);
                }
            }
        }

        console.log(`\n🏁 Resultado: ${insertedCount} inseridos, ${skippedCount} atualizados.`);

    } catch (err) {
        console.error('❌ Erro Fatal no Scraper:', err.message);
    }
}

rasparSecretarias();
