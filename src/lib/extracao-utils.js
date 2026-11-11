const crypto = require('node:crypto');
const path = require('node:path');

/**
 * Converte data brasileira (DD/MM/AAAA) para ISO de data (AAAA-MM-DD).
 * @param {string|null|undefined} dataPt Texto que contém a data.
 * @returns {string|null} Data ISO ou null se ausente/inválida.
 */
function dataBrParaIso(dataPt) {
  if (!dataPt) return null;
  const match = String(dataPt).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const valida =
    data.getUTCFullYear() === Number(ano) &&
    data.getUTCMonth() === Number(mes) - 1 &&
    data.getUTCDate() === Number(dia);
  return valida ? `${ano}-${mes}-${dia}` : null;
}

/**
 * Hash curto e estável de uma URL, usado para nomear objetos no R2.
 * @param {string} texto
 * @returns {string} 16 caracteres hexadecimais.
 */
function hashCurto(texto) {
  return crypto.createHash('sha1').update(String(texto)).digest('hex').slice(0, 16);
}

/**
 * Extensão de arquivo (com ponto) tirada do caminho de uma URL.
 * @param {string} url
 * @param {string} padrao Extensão usada quando não há uma reconhecível.
 * @returns {string}
 */
function extensaoDaUrl(url, padrao = '.bin') {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : padrao;
  } catch {
    return padrao;
  }
}

/**
 * Monta a chave de um objeto no R2: <organizacao>/<modulo>/[sub/]<hash><extensao>.
 * @param {{orgSlug: string, modulo: string, origem: string, extensao: string, subpasta?: string}} p
 * @returns {string}
 */
function chaveObjeto({ orgSlug, modulo, origem, extensao, subpasta }) {
  if (!orgSlug || !modulo || !origem) {
    throw new Error('chaveObjeto exige orgSlug, modulo e origem');
  }
  const partes = [orgSlug, modulo];
  if (subpasta) partes.push(subpasta);
  partes.push(`${hashCurto(origem)}${extensao || ''}`);
  return partes.join('/');
}

module.exports = { dataBrParaIso, hashCurto, extensaoDaUrl, chaveObjeto };
