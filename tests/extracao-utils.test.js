const test = require('node:test');
const assert = require('node:assert/strict');
const { dataBrParaIso, hashCurto, extensaoDaUrl, chaveObjeto } = require('../src/lib/extracao-utils');

test('dataBrParaIso converte data válida', () => {
  assert.equal(dataBrParaIso('Por Prefeitura 05/03/2024 #saude'), '2024-03-05');
});

test('dataBrParaIso devolve null para vazio, nulo e texto sem data', () => {
  assert.equal(dataBrParaIso(''), null);
  assert.equal(dataBrParaIso(null), null);
  assert.equal(dataBrParaIso(undefined), null);
  assert.equal(dataBrParaIso('sem data aqui'), null);
});

test('dataBrParaIso rejeita data inexistente', () => {
  assert.equal(dataBrParaIso('31/02/2024'), null);
  assert.equal(dataBrParaIso('00/10/2024'), null);
  assert.equal(dataBrParaIso('10/13/2024'), null);
});

test('hashCurto é estável, curto e distingue entradas', () => {
  assert.equal(hashCurto('a'), hashCurto('a'));
  assert.notEqual(hashCurto('a'), hashCurto('b'));
  assert.equal(hashCurto('qualquer coisa').length, 16);
});

test('extensaoDaUrl lê a extensão ignorando query string', () => {
  assert.equal(extensaoDaUrl('https://x.gov.br/img/foto.JPG?v=2'), '.jpg');
  assert.equal(extensaoDaUrl('https://x.gov.br/doc.pdf'), '.pdf');
});

test('extensaoDaUrl usa o padrão quando não há extensão ou a URL é inválida', () => {
  assert.equal(extensaoDaUrl('https://x.gov.br/sem-extensao'), '.bin');
  assert.equal(extensaoDaUrl('não é url', '.jpg'), '.jpg');
});

test('chaveObjeto monta organizacao/modulo/hash.ext e aceita subpasta', () => {
  const h = hashCurto('https://x/1');
  assert.equal(chaveObjeto({ orgSlug: 'aracati', modulo: 'noticias', origem: 'https://x/1', extensao: '.jpg' }), `aracati/noticias/${h}.jpg`);
  assert.equal(chaveObjeto({ orgSlug: 'aracati', modulo: 'noticias', origem: 'https://x/1', extensao: '.html', subpasta: 'raw' }), `aracati/noticias/raw/${h}.html`);
});

test('chaveObjeto exige organização, módulo e origem', () => {
  assert.throws(() => chaveObjeto({ modulo: 'noticias', origem: 'x', extensao: '' }));
  assert.throws(() => chaveObjeto({ orgSlug: 'a', origem: 'x', extensao: '' }));
  assert.throws(() => chaveObjeto({ orgSlug: 'a', modulo: 'noticias', extensao: '' }));
});
