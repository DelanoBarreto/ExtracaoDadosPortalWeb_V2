import { ScraperService } from '../engine/scraper.service.js';

function decodeCFEmail(cfemail) {
  if (!cfemail) return '';
  let email = "";
  let r = parseInt(cfemail.substr(0, 2), 16);
  for (let n = 2; cfemail.length - n; n += 2) {
    let i = parseInt(cfemail.substr(n, 2), 16) ^ r;
    email += String.fromCharCode(i);
  }
  return email;
}

async function startScraping() {
  const service = new ScraperService('SECRETARIAS');
  const { limit, municipio_id, url_base, municipio_nome } = service.args;

  if (!url_base || !municipio_id) {
    service.log('❌ Parâmetros insuficientes. --url_base e --municipio_id são obrigatórios.', 'error');
    process.exit(1);
  }

  service.log(`🚀 Iniciando Estrutura Administrativa | ${municipio_nome}`);
  
  try {
    const targetUrl = `${url_base}/secretaria.php`;
    const $ = await service.fetchHtml(targetUrl);
    if (!$) return;

    const cards = $('h6').parent('div').filter((_, el) => {
      const text = $(el).text();
      return (text.includes('Atendimento') || text.toLowerCase().includes('secretaria'));
    }).toArray();

    service.log(`ℹ️ Detectadas ${cards.length} secretarias/órgãos.`);

    let itemsSaved = 0;
    for (let i = 0; i < cards.length; i++) {
      if (itemsSaved >= limit) break;

      const card = $(cards[i]);
      const nome_secretaria = card.find('h6:first-of-type strong').text().trim() || card.find('h6:first-of-type').text().trim();
      if (!nome_secretaria) continue;

      service.logProgress(i + 1, cards.length, nome_secretaria);

      const nome_responsavel = card.find('h6:nth-of-type(2)').text().replace('+', '').trim();
      const cargo_responsavel = card.find('h6:nth-of-type(2)').next('p').text().trim();
      
      let email = '';
      const cfEmailEl = card.find('.__cf_email__');
      if (cfEmailEl.length > 0) email = decodeCFEmail(cfEmailEl.attr('data-cfemail'));
      else email = card.find('.bi-envelope-at-fill').parent().text().trim();

      const telefone = card.find('.bi-telephone-fill').parent().text().trim();
      const endereco = card.find('.bi-geo-alt-fill').parent().text().trim();
      const horario = card.find('.bi-clock').parent().text().trim();
      
      const photoSrc = card.parent().find('img').attr('src') || card.find('img').attr('src');
      let foto_url = null;
      if (photoSrc) {
        const fotoUrlOrigem = photoSrc.startsWith('http') ? photoSrc : `${url_base}/${photoSrc.replace(/^\//, '')}`;
        foto_url = await service.uploadMedia(fotoUrlOrigem, 'arquivos_municipais', `${municipio_nome}/Secretarias`);
      }

      const sucesso = await service.salvarDados('tab_secretarias', {
        municipio_id,
        nome_secretaria,
        nome_responsavel,
        cargo_responsavel,
        email,
        telefone,
        horario_atendimento: horario,
        endereco,
        foto_url,
        exercicio: new Date().getFullYear(),
        status: 'rascunho'
      }, 'nome_secretaria');

      if (sucesso) itemsSaved++;
    }

    service.log(`🏁 FIM: ${itemsSaved} secretarias sincronizadas.`, 'success');
    process.exit(0);
  } catch (err) {
    service.log(`❌ ERRO: ${err.message}`, 'error');
    process.exit(1);
  }
}

startScraping();
