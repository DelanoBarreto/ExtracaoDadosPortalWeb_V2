const axios = require('axios');
const { supabase } = require('../lib/supabase-bot');

// Limite seguro: 45MB (margem abaixo do limite de 50MB do Supabase free tier)
const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;

class ScraperService {
  /**
   * Faz o download de uma mídia (imagem) e sobe para o Supabase Storage.
   * Para PDFs grandes, use uploadPDF() que suporta divisão automática.
   */
  async uploadMedia(url, bucketName = 'arquivos_municipais') {
    try {
      if (!url || url.startsWith('data:')) return null;

      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
      const buffer = Buffer.from(response.data, 'binary');

      const fileName  = url.split('/').pop().split('?')[0];
      const timestamp = Date.now();
      const path      = `${timestamp}_${fileName}`;

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, {
          contentType: response.headers['content-type'],
          upsert: true
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
      return publicData.publicUrl;
    } catch (err) {
      console.error(`⚠️ Erro no upload de ${url}:`, err.message);
      return null;
    }
  }

  /**
   * Faz o download de um PDF e o envia para o Storage.
   * Se o arquivo ultrapassar 45MB, divide automaticamente em partes por páginas.
   *
   * @param {string} url         - URL do PDF a baixar
   * @param {string} bucketName  - Bucket do Supabase Storage
   * @returns {Promise<Array<{storageUrl: string, urlOriginal: string}>>}
   *          Array com objetos { storageUrl, urlOriginal } de cada parte.
   *          Retorna array vazio em caso de falha total.
   */
  async uploadPDF(url, bucketName = 'arquivos_municipais') {
    try {
      console.log(`      ⬇️  Baixando PDF...`);
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      const buffer   = Buffer.from(response.data, 'binary');
      const sizeMB   = (buffer.length / 1024 / 1024).toFixed(1);
      const baseName = url.split('/').pop().split('?')[0];
      const timestamp = Date.now();

      // ── Arquivo dentro do limite ──────────────────────────────────────────
      if (buffer.length <= MAX_UPLOAD_BYTES) {
        const path = `${timestamp}_${baseName}`;
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(path, buffer, { contentType: 'application/pdf', upsert: true });

        if (error) throw error;

        const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
        console.log(`      ✅ Upload OK (${sizeMB}MB).`);
        return [{ storageUrl: data.publicUrl, urlOriginal: url }];
      }

      // ── Arquivo GRANDE: divide por páginas ───────────────────────────────
      console.log(`      ✂️  PDF grande (${sizeMB}MB). Dividindo em partes...`);
      const { PDFDocument } = require('pdf-lib');

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      } catch (loadErr) {
        console.error(`      ❌ pdf-lib não conseguiu carregar o PDF: ${loadErr.message}`);
        console.log(`      ⚠️  Salvando URL original como fallback.`);
        return [{ storageUrl: url, urlOriginal: url }];
      }

      const totalPaginas = pdfDoc.getPageCount();
      if (totalPaginas <= 1) {
        console.warn(`      ⚠️  PDF de 1 página mas ${sizeMB}MB — impossível dividir. Usando URL original.`);
        return [{ storageUrl: url, urlOriginal: url }];
      }

      // Calcula quantas partes são necessárias (arredonda pra cima)
      const numPartes    = Math.ceil(buffer.length / MAX_UPLOAD_BYTES);
      const paginasParte = Math.ceil(totalPaginas / numPartes);

      console.log(`      📐 ${totalPaginas} páginas → ${numPartes} parte(s) de ~${paginasParte} pág. cada.`);

      const resultados = [];
      let parte = 1;

      for (let startPage = 0; startPage < totalPaginas; startPage += paginasParte) {
        const endPage = Math.min(startPage + paginasParte, totalPaginas);
        const indices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

        const partDoc = await PDFDocument.create();
        const copiadas = await partDoc.copyPages(pdfDoc, indices);
        copiadas.forEach(p => partDoc.addPage(p));

        const partBuffer = Buffer.from(await partDoc.save());
        const parteMB    = (partBuffer.length / 1024 / 1024).toFixed(1);
        const partePath  = `${timestamp}_parte${parte}of${numPartes}_${baseName}`;
        const urlParteOriginal = `${url}#parte${parte}de${numPartes}`;

        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(partePath, partBuffer, { contentType: 'application/pdf', upsert: true });

        if (uploadErr) {
          console.error(`      ❌ Falha na parte ${parte}: ${uploadErr.message}`);
          resultados.push({ storageUrl: url, urlOriginal: urlParteOriginal }); // fallback com URL original
        } else {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(partePath);
          console.log(`      ✅ Parte ${parte}/${numPartes}: ${parteMB}MB enviada.`);
          resultados.push({ storageUrl: data.publicUrl, urlOriginal: urlParteOriginal });
        }

        parte++;
      }

      return resultados;
    } catch (err) {
      console.error(`⚠️ Erro no uploadPDF de ${url}:`, err.message);
      return [];
    }
  }

  /**
   * UPSERT de notícia na tab_noticias.
   */
  async salvarNoticia(noticia) {
    const { error } = await supabase
      .from('tab_noticias')
      .upsert(noticia, { onConflict: 'url_original' });

    if (error) {
      console.error(`❌ Erro ao salvar notícia [${noticia.titulo}]:`, error.message);
      return false;
    }
    return true;
  }

  /**
   * UPSERT de arquivo LRF na tab_lrf.
   */
  async salvarLRF(item) {
    const { error } = await supabase
      .from('tab_lrf')
      .upsert(item, { onConflict: 'url_original' });

    if (error) {
      console.error(`❌ Erro ao salvar LRF [${item.titulo}]:`, error.message);
      return false;
    }
    return true;
  }
}

module.exports = new ScraperService();
