import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env da raiz do projeto
dotenv.config({ path: path.join(process.cwd(), '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseKey);

class ScraperService {
  constructor(moduleName = 'BASE') {
    this.moduleName = moduleName;
    this.supabase = supabaseClient;
    this.args = this.parseArgs();
  }

  parseArgs() {
    const raw = process.argv.slice(2);
    return {
      limit: parseInt(raw.find(a => a.startsWith('--limit='))?.split('=')[1] || '10', 10),
      municipio_id: raw.find(a => a.startsWith('--municipio_id='))?.split('=')[1],
      url_base: raw.find(a => a.startsWith('--url_base='))?.split('=')[1]?.replace(/\/$/, ''),
      municipio_nome: raw.find(a => a.startsWith('--municipio_nome='))?.split('=')[1] || 'Admin',
    };
  }

  log(msg, type = 'info') {
    const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
    console.log(`${icons[type] || '🔹'} [${this.moduleName}] ${msg}`);
  }

  async fetchHtml(url) {
    try {
      const { data } = await axios.get(url, { 
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PortalGovV4' }
      });
      return cheerio.load(data);
    } catch (err) {
      this.log(`Erro ao carregar HTML: ${url} -> ${err.message}`, 'error');
      return null;
    }
  }

  async uploadMedia(url, bucket = 'arquivos_municipais', folder = '') {
    try {
      if (!url || url.startsWith('data:')) return null;
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      const buffer = Buffer.from(response.data, 'binary');
      const ext = url.split('.').pop().split('?')[0] || 'jpg';
      const fileName = `${Date.now()}_media.${ext}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { error } = await this.supabase.storage.from(bucket).upload(filePath, buffer, {
        contentType: response.headers['content-type'],
        upsert: true
      });
      if (error) throw error;

      const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      this.log(`Falha upload media: ${err.message}`, 'warn');
      return null;
    }
  }

  async uploadPDF(url, bucket = 'arquivos_municipais', folder = '') {
    const sUrl = await this.uploadMedia(url, bucket, folder);
    return sUrl ? [sUrl] : [];
  }

  async salvarDados(tabela, dados, conflito = 'url_original') {
    try {
      const { error } = await this.supabase.from(tabela).upsert(dados, { onConflict: conflito });
      if (error) throw error;
      return true;
    } catch (err) {
      this.log(`Erro ao salvar em ${tabela}: ${err.message}`, 'error');
      return false;
    }
  }

  logProgress(current, total, msg = '') {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
    console.log(`[${bar}] ${percent}% | ${current}/${total} | ${msg}`);
  }
}

export { ScraperService };
export default new ScraperService();
