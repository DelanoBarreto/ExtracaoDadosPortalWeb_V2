const axios = require('axios');
const cheerio = require('cheerio');

async function debugHtml() {
  const url = 'https://aracati.ce.gov.br/informa.php';
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  console.log('--- Analisando Links ---');
  $('a[href*="/informa/"]').slice(0, 10).each((i, el) => {
    console.log(`Link ${i}: ${$(el).attr('href')} | Texto: ${$(el).text().trim()}`);
  });
}

debugHtml();
