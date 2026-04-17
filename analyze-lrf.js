const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeLRF() {
  const url = 'https://aracati.ce.gov.br/lrf.php';
  console.log(`Buscando ${url}...`);
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const $ = cheerio.load(data);
    
    console.log('--- Abas / Categorias Ativas ---');
    $('.nav-tabs li a').each((i, el) => {
      console.log(`Aba: ${$(el).text().trim()} | Href: ${$(el).attr('href')}`);
    });

    console.log('\n--- Links de Documentos LRF (top 20) ---');
    let count = 0;
    $('a[href*="lrf.php?id="], a[href*="lrf.php?cat="]').each((i, el) => {
      if (count >= 20) return;
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      const parentClass = $(el).parent().attr('class');
      console.log(`Doc: ${text} | Href: ${href} | Parent: ${parentClass}`);
      count++;
    });

    console.log('\n--- Seletores com "accordion", "collapse" ou "panel" ---');
    $('.panel, .accordion, .collapse, [data-toggle="collapse"]').each((i, el) => {
        if(i < 10) {
            console.log(`Elemento ID: ${$(el).attr('id')} | Classe: ${$(el).attr('class')} | Tag: ${el.tagName}`);
        }
    });
    
  } catch(e) {
    console.error('Erro:', e.message);
  }
}

analyzeLRF();
