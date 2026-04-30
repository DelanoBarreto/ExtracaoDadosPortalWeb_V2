/**
 * debug-secretaria-fields.js
 * Testa a extração de CNPJ, Biografia e Funções de uma URL real.
 * Uso: node scripts/debug-secretaria-fields.js --url "https://aracati.ce.gov.br/secretaria.php?sec=5"
 */

const cheerio = require('cheerio');
const parseArgs = require('util').parseArgs;

const { values } = parseArgs({ options: { url: { type: 'string' } } });
const url = values.url || 'https://aracati.ce.gov.br/secretaria.php?sec=5';

async function debug() {
    console.log(`\n🔍 Testando URL: ${url}\n`);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalGovBot/2.0)' } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // ── CNPJ ──────────────────────────────────────────────
    console.log('=== CNPJ ===');
    const cnpjRegex = /CNPJ[\s:]+([^\n]+)/i;
    const cnpjBodyMatch = bodyText.match(cnpjRegex);
    console.log('  [extractField bodyText]:', cnpjBodyMatch ? cnpjBodyMatch[1].trim() : 'NÃO ENCONTRADO');

    const cnpjNumericMatch = bodyText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    console.log('  [Regex numérico]:', cnpjNumericMatch ? cnpjNumericMatch[0] : 'NÃO ENCONTRADO');

    const cnpjPTag = $('p:contains("CNPJ")').first();
    console.log('  [p:contains("CNPJ") texto]:', cnpjPTag.length ? cnpjPTag.text().trim() : 'NÃO ENCONTRADO');
    console.log('  [p:contains("CNPJ") HTML]:', cnpjPTag.length ? cnpjPTag.html()?.substring(0, 150) : 'NÃO ENCONTRADO');

    // ── BIOGRAFIA ─────────────────────────────────────────
    console.log('\n=== BIOGRAFIA ===');
    // Estratégia 1: p[style*="text-align:justify"]
    const bioJustify = $('p[style*="text-align:justify"], p[style*="text-align: justify"]').first();
    console.log('  [p text-align:justify] (primeiros 100 chars):', bioJustify.length ? bioJustify.text().trim().substring(0, 100) : 'NÃO ENCONTRADO');

    // Estratégia 2: p longo
    let bioLong = null;
    $('p').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.length > 150 && !/copyright|lgpd|cookie/i.test(txt)) {
            bioLong = txt.substring(0, 100);
            return false;
        }
    });
    console.log('  [p longo > 150] (primeiros 100 chars):', bioLong || 'NÃO ENCONTRADO');

    // ── FUNÇÕES ───────────────────────────────────────────
    console.log('\n=== FUNÇÕES ===');
    let tituloEl = null;
    $('div.titulo2, h2, h3, h4, strong').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.includes('atribuições') || text.includes('competência') || text.includes('funções')) {
            tituloEl = $(el);
            console.log('  [Título encontrado]:', $(el).text().trim(), '| tag:', el.name, '| classe:', $(el).attr('class'));
            return false;
        }
    });

    if (!tituloEl) {
        console.log('  [TÍTULO] NÃO ENCONTRADO!');
        // Mostra todos os div.titulo2 para diagnóstico
        console.log('  [div.titulo2 encontrados]:');
        $('div.titulo2').each((i, el) => console.log(`    ${i}: "${$(el).text().trim()}"`));
    } else {
        const proximos = tituloEl.nextUntil('div.titulo2, div.tab-pane, h2, h3, h4');
        console.log('  [Elementos após o título]:', proximos.length);
        let count = 0;
        proximos.each((_, el) => {
            const txt = $(el).text().trim();
            if (txt && txt.length > 5 && count < 3) {
                console.log(`    • ${txt.substring(0, 80)}`);
                count++;
            }
        });
    }

    console.log('\n✅ Debug concluído!\n');
}

debug().catch(err => console.error('❌ Erro:', err.message));
