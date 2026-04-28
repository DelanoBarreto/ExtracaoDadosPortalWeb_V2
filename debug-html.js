const axios = require('axios');
const cheerio = require('cheerio');

async function debugHtml() {
  const url = process.argv[2] || 'https://aracati.ce.gov.br/informa.php';
  console.log(`Lendo: ${url}`);
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  console.log('--- Analisando Links ---');
  $('a').slice(0, 50).each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (href.includes('lrf.php') || href.includes('.pdf'))) {
        console.log(`Link ${i}: ${href} | Texto: ${text}`);
    }
  });

  console.log('\n--- Analisando H3/H4/H5 ---');
  $('h1, h2, h3, h4, h5').each((i, el) => {
    console.log(`${el.tagName}: ${$(el).text().trim()}`);
  });

  console.log('\n--- Texto dos Strongs ---');
  $('strong').each((i, el) => {
    console.log(`Strong: ${$(el).text().trim()}`);
  });
}

debugHtml();
