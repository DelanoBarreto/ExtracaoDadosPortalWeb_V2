const axios = require('axios');
const cheerio = require('cheerio');

async function findPagination() {
  const url = 'https://aracati.ce.gov.br/informa.php';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  console.log('--- Links Possíveis de Paginação ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (href.includes('pag=') || text.includes('Próximo') || text.match(/^\d+$/))) {
      console.log(`Texto: ${text} | Href: ${href}`);
    }
  });
}

findPagination();
