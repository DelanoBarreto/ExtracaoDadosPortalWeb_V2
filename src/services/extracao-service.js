const { supabase } = require('../lib/supabase-bot');

/**
 * Busca a fonte (site antigo) de uma organização pelo slug.
 * @param {string} slug Ex.: "aracati".
 * @returns {Promise<{organizacao_id: string, slug: string, nome: string, url_base: string}>}
 * @throws {Error} Se a organização não tiver fonte cadastrada.
 */
async function obterFonte(slug) {
  if (!slug) throw new Error('Informe --org=<slug> (ex.: --org=aracati).');
  const { data, error } = await supabase
    .from('fontes_municipio')
    .select('organizacao_id, slug, nome, url_base')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar fonte "${slug}": ${error.message}`);
  if (!data) throw new Error(`Organização "${slug}" não tem fonte em extracao.fontes_municipio.`);
  return data;
}

/**
 * Abre o registro da execução. Se já existe um pedido `pendente`, assume ele.
 * @param {{organizacaoId: string, modulo: string, parametros?: object, execucaoId?: string}} p
 * @returns {Promise<string>} id da execução.
 */
async function iniciarExecucao({ organizacaoId, modulo, parametros = {}, execucaoId }) {
  if (execucaoId) {
    const { error } = await supabase
      .from('execucoes_raspagem')
      .update({ status: 'em_andamento', iniciado_em: new Date().toISOString() })
      .eq('id', execucaoId)
      .eq('organizacao_id', organizacaoId);
    if (error) throw new Error(`Falha ao assumir execução ${execucaoId}: ${error.message}`);
    return execucaoId;
  }
  const { data, error } = await supabase
    .from('execucoes_raspagem')
    .insert({ organizacao_id: organizacaoId, modulo, status: 'em_andamento', parametros })
    .select('id')
    .single();
  if (error) throw new Error(`Falha ao abrir execução: ${error.message}`);
  return data.id;
}

/**
 * Fecha a execução com os totais.
 * @param {string} execucaoId
 * @param {{status: 'concluida'|'falhou', lidos: number, novos: number, erros: number, erroResumo?: string}} r
 */
async function finalizarExecucao(execucaoId, { status, lidos, novos, erros, erroResumo = null }) {
  const { error } = await supabase
    .from('execucoes_raspagem')
    .update({
      status,
      finalizado_em: new Date().toISOString(),
      itens_lidos: lidos,
      itens_novos: novos,
      itens_erro: erros,
      erro_resumo: erroResumo ? String(erroResumo).slice(0, 500) : null,
    })
    .eq('id', execucaoId);
  if (error) console.error(`⚠️ Não foi possível fechar a execução ${execucaoId}: ${error.message}`);
}

/**
 * Indica se a notícia (por URL de origem) já foi preparada para a organização.
 * @returns {Promise<boolean>}
 */
async function noticiaJaExiste(organizacaoId, urlOriginal) {
  const { data, error } = await supabase
    .from('noticias')
    .select('id')
    .eq('organizacao_id', organizacaoId)
    .eq('url_original', urlOriginal)
    .maybeSingle();
  if (error) throw new Error(`Falha ao consultar notícia: ${error.message}`);
  return Boolean(data);
}

/**
 * Grava uma notícia na área de preparação com situação `a_revisar`.
 * @param {object} noticia Colunas de extracao.noticias (sem situacao; entra como a_revisar).
 * @returns {Promise<'criada'|'duplicada'>}
 */
async function salvarNoticia(noticia) {
  const { error } = await supabase.from('noticias').insert({ ...noticia, situacao: 'a_revisar' });
  if (!error) return 'criada';
  if (error.code === '23505') return 'duplicada'; // índice único (organizacao_id, url_original)
  throw new Error(`Falha ao salvar notícia: ${error.message}`);
}

module.exports = { obterFonte, iniciarExecucao, finalizarExecucao, noticiaJaExiste, salvarNoticia };
