/**
 * debug-secretaria-upsert.js
 * Testa o scrape completo e mostra o que seria salvo no banco SEM GRAVAR.
 * Uso: node scripts/debug-secretaria-upsert.js --url "https://aracati.ce.gov.br/secretaria.php?sec=5"
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const parseArgs = require('util').parseArgs;

require('dotenv').config({ path: __dirname + '/../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { values } = parseArgs({
    options: {
        url: { type: 'string' },
        municipio_id: { type: 'string' }
    }
});

const url = values.url || 'https://aracati.ce.gov.br/secretaria.php?sec=5';
const municipioId = values.municipio_id;

function extractField(text, prefix) {
    const regex = new RegExp(`${prefix}[:\\s]+([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

async function main() {
    console.log(`\n🔍 Simulando raspar + salvar para: ${url}\n`);

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalGovBot/2.0)' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // CNPJ
    let cnpj = extractField(bodyText, 'CNPJ');
    if (!cnpj) {
        const match = bodyText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
        if (match) cnpj = match[0];
    }

    // Biografia
    let biografia = null;
    $('p[style*="text-align:justify"], p[style*="text-align: justify"]').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 30) { biografia = txt; return false; }
    });

    // Funções
    let funcoes = null;
    let tituloEl = null;
    $('div.titulo2, h2, h3, h4, strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('atribuições') || text.includes('competência') || text.includes('funções')) {
            tituloEl = $(el);
            return false;
        }
    });
    if (tituloEl) {
        let txt = '';
        tituloEl.nextUntil('div.titulo2, div.tab-pane, h2, h3, h4').each((_, el) => {
            const t = $(el).text().trim();
            if (t && t.length > 5) txt += '• ' + t + '\n';
        });
        if (txt) funcoes = txt.trim();
    }

    console.log('📦 DADOS EXTRAÍDOS:');
    console.log('  cnpj     :', cnpj || '❌ NULL');
    console.log('  biografia:', biografia ? biografia.substring(0, 80) + '...' : '❌ NULL');
    console.log('  funcoes  :', funcoes ? funcoes.split('\n')[0].substring(0, 80) + '...' : '❌ NULL');

    if (!municipioId) {
        console.log('\n⚠️  Passe --municipio_id para verificar o banco de dados.');
        return;
    }

    // Verifica os registros atuais no banco
    console.log('\n📊 REGISTROS NO BANCO (municipio_id=' + municipioId + '):');
    const { data, error } = await supabase
        .from('tab_secretarias')
        .select('id, nome_secretaria, cnpj, biografia, funcoes')
        .eq('municipio_id', municipioId)
        .limit(5);

    if (error) {
        console.error('❌ Erro ao buscar banco:', error.message);
    } else {
        data.forEach(row => {
            console.log(`\n  ID: ${row.id} | Nome: ${row.nome_secretaria}`);
            console.log(`    cnpj     : ${row.cnpj || '❌ NULL'}`);
            console.log(`    biografia: ${row.biografia ? row.biografia.substring(0, 60) + '...' : '❌ NULL'}`);
            console.log(`    funcoes  : ${row.funcoes ? row.funcoes.substring(0, 60) + '...' : '❌ NULL'}`);
        });
    }

    console.log('\n✅ Diagnóstico concluído. (NADA foi gravado)\n');
}

main().catch(err => console.error('❌ Erro fatal:', err.message));
