const cheerio = require('cheerio');
const axios = require('axios');

async function test() {
  const { data: html } = await axios.get('https://aracati.ce.gov.br/secretaria.php');
  const $ = cheerio.load(html);
  const cards = $('h6').parent('div').filter((_, el) => {
      return $(el).find('h6').length >= 2 && $(el).text().includes('Atendimento') || $(el).text().toLowerCase().includes('secretaria');
  });
  cards.each((_, el) => {
      const card = $(el);
      // Onde fica a imagem? Em Aracati, geralmente o h6 responsavel está em uma estrutura superior, ou há um img.
      // O card inteiro é a div:
      const imgSrc = card.parent().find('img').attr('src') || card.find('img').attr('src') || card.closest('.row').find('img').attr('src');
      console.log('Secretaria:', card.find('h6:first-of-type strong').text().trim() || card.find('h6:first-of-type').text().trim());
      console.log('Image:', imgSrc);
  });
}
test();
