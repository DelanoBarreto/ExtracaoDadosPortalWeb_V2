require('dotenv').config();
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const accountId = process.env.Extracao_dados_R2_ACCOUNT_ID;
const accessKeyId = process.env.Extracao_dados_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.Extracao_dados_R2_SECRET_ACCESS_KEY;
const bucket = process.env.Extracao_dados_R2_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error('Variáveis Extracao_dados_R2_* ausentes no .env (ACCOUNT_ID, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY).');
}

// Bucket privado: o banco guarda só a CHAVE do objeto; o acesso é por URL pré-assinada no servidor.
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

/**
 * Grava um objeto no bucket R2 de preparação.
 * @param {string} key Chave do objeto (ex.: aracati/noticias/ab12.jpg).
 * @param {Buffer|string} body Conteúdo.
 * @param {string} contentType Tipo MIME.
 * @returns {Promise<string>} A própria chave, para gravar no banco.
 */
async function enviarObjeto(key, body, contentType = 'application/octet-stream') {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

/**
 * Verifica se um objeto já existe (evita reenviar arquivo já raspado).
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function objetoExiste(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

module.exports = { enviarObjeto, objetoExiste, bucket };
