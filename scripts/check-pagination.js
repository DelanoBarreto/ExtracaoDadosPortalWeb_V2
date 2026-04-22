const axios = require('axios');
const cheerio = require('cheerio');

async function checkPagination() {
  const url0 = 'https://aracati.ce.gov.br/lrf.php';
  const url1 = 'https://aracati.ce.gov.br/lrf.php?pagina=1';
  
  const r0 = await axios.get(url0);
  const r1 = await axios.get(url1);
  
  const $0 = cheerio.load(r0.data);
  const $1 = cheerio.load(r1.data);
  
  console.log('Links na Página 0:', $0('a[href*="lrf.php?id="]').length);
  console.log('Links na Página 1:', $1('a[href*="lrf.php?id="]').length);
}

checkPagination();
