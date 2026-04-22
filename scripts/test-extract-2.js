const axios = require('axios');
const cheerio = require('cheerio');

async function check() {
    const r = await axios.get('https://aracati.ce.gov.br/informa/1288/paix-o-de-cristo-de-quixaba-emociona-p-blico-e-ref');
    const $ = cheerio.load(r.data);
    
    // Mostrando spans ou divs menores que possam conter esses dados
    const results = [];
    $('*').each((i, el) => {
        const text = $(el).clone().children().remove().end().text().trim();
        if (text) {
            results.push(text);
        }
    });

    const txt = results.join(' | ');
    console.log('Categoria:', txt.match(/.{0,20}cat.{0,20}/gi));
    console.log('Acesso:', txt.match(/.{0,20}acess.{0,20}/gi));
    console.log('Por:', txt.match(/.{0,20}por .{0,20}/gi));
    console.log('Visualizações:', txt.match(/.{0,20}visuali.{0,20}/gi));
    
    // Tenta encontrar o texto da barra lateral ou cabeçalho do artigo
    console.log('\nTop Texts na Página:');
    console.log(results.slice(0, 100).join(' \n'));
}

check();
