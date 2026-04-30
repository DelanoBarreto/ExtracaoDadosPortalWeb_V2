/**
 * test-funcoes-extract.js — Testa nova lógica de extração de funções
 * Uso: node scripts/test-funcoes-extract.js
 */

const cheerio = require('cheerio');

const KEYWORDS = ['visão', 'atribuições', 'competência', 'funções', 'missão'];

async function test() {
    const res = await fetch('https://aracati.ce.gov.br/secretaria.php?sec=5', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(await res.text());

    let secaoContainer = null;
    $('div.titulo2').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (KEYWORDS.some(kw => text.includes(kw))) {
            secaoContainer = $(el).closest('div.row, div.tab-pane, div.tab-content, div[class*="col"]');
            if (!secaoContainer.length) secaoContainer = $(el).parent();
            return false;
        }
    });

    if (!secaoContainer || !secaoContainer.length) {
        console.log('❌ CONTAINER NÃO ENCONTRADO');
        // Diagnóstico: mostra todos os div.titulo2
        console.log('\nDiv.titulo2 encontrados:');
        $('div.titulo2').each((i, el) => console.log(`  ${i}: "${$(el).text().trim()}"`));
        return;
    }

    let linhas = [];
    secaoContainer.children().each((_, el) => {
        const $el = $(el);
        const classes = ($el.attr('class') || '').toLowerCase();
        const texto = $el.text().trim();

        if (!texto || texto === '\u00a0' || texto.replace(/\s/g, '').length === 0) return;

        if (classes.includes('titulo2')) {
            if (linhas.length > 0) linhas.push('');
            linhas.push(texto.toUpperCase());
            return;
        }

        if (classes.includes('col-')) {
            const t = $el.clone().find('i').remove().end().text().trim();
            if (t && t.length > 3) linhas.push('✔ ' + t);
            return;
        }

        if (el.name === 'p' && texto.length > 5) linhas.push(texto);
    });

    const preview = linhas.slice(0, 15).join('\n');
    console.log('=== PRÉVIA DO RESULTADO (15 primeiras linhas) ===\n');
    console.log(preview);
    console.log('\n...');
    console.log(`\n✅ Total de linhas: ${linhas.length}`);
}

test().catch(err => console.error('❌ Erro:', err.message));
