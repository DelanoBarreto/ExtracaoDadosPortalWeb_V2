const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('c:\\Antigravity\\ExtracaoDadosPortalWeb_V2\\scratch_sec.html', 'utf8');
const $ = cheerio.load(html);

// Biografia is usually inside the modal of the *current* gestor.
// Wait, the current gestor is Mariana Silva Costa.
const nome_responsavel = 'Mariana Silva Costa';

let biografia = null;
$('h4.modal-title').each((_, el) => {
    const h4Text = $(el).text().trim();
    if (nome_responsavel && h4Text.includes(nome_responsavel.split(' ')[0])) {
        const modalBody = $(el).closest('.modal-content').find('.modal-body');
        // A biografia geralmente está em div[style*="text-align:justify"] ou no texto da modal
        const bioDiv = modalBody.find('div[style*="text-align:justify"]');
        if (bioDiv.length) {
            biografia = bioDiv.text().trim();
        } else {
            biografia = modalBody.text().trim();
        }
    }
});

console.log('Biografia:', biografia);

// Funções
const funcoesNode = $('div.titulo2:contains("Atribuições da Secretaria")').nextUntil('div.titulo2, div.tab-pane, h3, h4');
let funcoesHtml = '';
funcoesNode.each((i, el) => {
    // extract inner html to keep formatting, but strip outer div
    let html = $(el).html();
    if (html) {
        funcoesHtml += html.trim() + '<br/>';
    }
});

console.log('Funções (HTML):', funcoesHtml);

