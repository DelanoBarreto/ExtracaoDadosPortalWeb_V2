const axios = require('axios');
const cheerio = require('cheerio');

async function debugNoticia() {
  const url = 'https://aracati.ce.gov.br/informa/1299/defesa-civil-de-aracati-refor-a-seguran-a-em-reas-';
  console.log('Testando URL:', url);
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    console.log('--- ESTRUTURA DA NOTÍCIA ---');
    console.log('Título (meta):', $('meta[property="og:title"]').attr('content'));
    console.log('Título (h1):', $('h1').text().trim());
    
    // Tenta encontrar a data
    const dateText = $('body').text().match(/(\d{2}\/\d{2}\/\d{4})/);
    console.log('Data encontrada via Regex:', dateText ? dateText[0] : 'Não encontrada');
    
    // Procura por elementos de data
    const possibleDates = $('.data', '.date', 'time', '.posted-on');
    possibleDates.each((i, el) => console.log(`Data (CSS ${$(el).attr('class')}):`, $(el).text().trim()));

    // Pegar o conteúdo
    // No site de Aracati, parece que o texto fica numa div principal de conteúdo.
    const bodyText = $('.container').text().trim();
    console.log('Resumo do Body (container):', bodyText.substring(0, 300) + '...');
    
  } catch (e) {
    console.error('Erro ao acessar:', e.message);
  }
}

debugNoticia();
