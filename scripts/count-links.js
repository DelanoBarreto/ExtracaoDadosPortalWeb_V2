const axios = require('axios');
const cheerio = require('cheerio');

async function countLinks() {
  const url = 'https://aracati.ce.gov.br/lrf.php';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const links = $('a[href*="lrf.php?id="]');
  console.log('Total de links detectados:', links.length);
  
  const years = {};
  links.each((i, el) => {
      const text = $(el).text();
      const match = text.match(/\d{4}/);
      if (match) {
          const year = match[0];
          years[year] = (years[year] || 0) + 1;
      }
  });
  console.log('Links por texto (ano):', years);
}

countLinks();
