const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('sample-noticia.html', 'utf8');
const $ = cheerio.load(html);

console.log('-- Título:');
console.log($('h1').first().text().trim());

console.log('-- Outros dados na página:');
// Procurar por "acessos", "categoria", "por"
const texts = [];
$('*').each((i, el) => {
    const text = $(el).contents().filter(function() {
        return this.nodeType === 3; // Text node
    }).text().trim();
    
    if (text.toLowerCase().includes('acesso') || 
        text.toLowerCase().includes('visualiza') || 
        text.toLowerCase().includes('por ') ||
        text.toLowerCase().includes('categoria')) {
        const parentClass = $(el).parent().attr('class') || '';
        texts.push({
            el: el.tagName,
            class: $(el).attr('class'),
            parentClass,
            text
        });
    }
});
console.log(texts.slice(0, 20));

// Tentar pegar blocos de meta (autor, data, visualizações)
console.log('\n-- Meta dados típicos do WordPress/CMS:');
console.log($('.cat, .category, .post-meta, .meta, .author, .views, .acessos, .date, .time').text().replace(/\s+/g, ' ').trim().substring(0, 500));
