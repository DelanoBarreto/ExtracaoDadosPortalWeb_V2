const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { supabase } = require('./lib/supabase-bot');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const logFile = path.join(__dirname, '../last-run.log');

// Limpa o arquivo de log no início
fs.writeFileSync(logFile, 'Iniciando servidor...\n');

let isProcessing = false;
let currentScrapeProcess = null;

/**
 * Endpoints de Gestão
 */

// Listar municípios
app.get('/api/municipios', async (req, res) => {
    const { data, error } = await supabase.from('tab_municipios').select('*').order('nome');
    if (error) return res.status(500).json(error);
    res.json(data);
});

// Cadastrar novo município
app.post('/api/municipios', async (req, res) => {
    const { nome, url_base } = req.body;
    if (!nome || !url_base) {
        return res.status(400).json({ error: 'nome e url_base são obrigatórios' });
    }
    const { data, error } = await supabase
        .from('tab_municipios')
        .insert([{ nome, url_base }])
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Município ${nome} cadastrado com sucesso`, municipio: data });
});

// Debug: verificar dados LRF no banco (sem filtro)
app.get('/api/debug-lrf', async (req, res) => {
    const { data, error } = await supabase
        .from('tab_lrf')
        .select('id, titulo, municipio_id, data_publicacao')
        .limit(10);
    if (error) return res.status(500).json(error);
    res.json({ total: data?.length, sample: data });
});

// Status do banco
app.get('/api/stats', async (req, res) => {
    const { count: noticias } = await supabase.from('tab_noticias').select('*', { count: 'exact', head: true });
    const { count: lrf } = await supabase.from('tab_lrf').select('*', { count: 'exact', head: true });
    const { count: secretarias } = await supabase.from('tab_secretarias').select('*', { count: 'exact', head: true });
    res.json({ noticias: noticias || 0, lrf: lrf || 0, secretarias: secretarias || 0 });
});

// Listar notícias do banco
app.get('/api/noticias', async (req, res) => {
    const { data, error } = await supabase.from('tab_noticias').select('*').order('data_publicacao', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// Listar arquivos LRF do banco
app.get('/api/lrf', async (req, res) => {
    console.log('🔍 Buscando Arquivos LRF no banco...');
    const { data, error } = await supabase
        .from('tab_lrf')
        .select('*')
        .order('data_publicacao', { ascending: false });
    
    if (error) {
        console.error('❌ Erro no Supabase:', error);
        return res.status(500).json(error);
    }
    res.json(data || []);
});

// Listar secretarias do banco
app.get('/api/secretarias', async (req, res) => {
    const { data, error } = await supabase.from('tab_secretarias').select('*').order('nome_secretaria', { ascending: true });
    if (error) return res.status(500).json(error);
    res.json(data || []);
});

// Executar Scraper
app.post('/api/scrape', async (req, res) => {
    if (isProcessing) {
        return res.status(400).json({ error: 'Uma raspagem já está em andamento.' });
    }

    const { modulo = 'noticias', municipio_id, limit = 20 } = req.body;

    if (!municipio_id) {
        return res.status(400).json({ error: 'municipio_id é obrigatório.' });
    }

    // Busca dados do município para passar ao script
    const { data: municipio, error: munError } = await supabase
        .from('tab_municipios')
        .select('*')
        .eq('id', municipio_id)
        .single();

    if (munError || !municipio) {
        return res.status(404).json({ error: 'Município não encontrado.' });
    }

    // Mapeia explicitamente o módulo para o script correto
    const SCRIPT_MAP = {
        'noticias':    '../raspar-noticias-v2.js',
        'lrf':         '../raspar-lrf.js',
        'secretarias': '../raspar-secretarias-v1.js',
        'decretos':    '../raspar-decretos.js',
        'leis':        '../raspar-leis.js',
    };
    const targetScript = SCRIPT_MAP[modulo];
    if (!targetScript) {
        return res.status(400).json({ error: `Módulo '${modulo}' não possui script mapeado ainda.` });
    }
    const scriptPath = path.join(__dirname, targetScript);
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ error: `Script não encontrado: ${path.basename(scriptPath)}` });
    }

    const logMsg = `🚀 [${new Date().toLocaleTimeString()}] Módulo: [${modulo.toUpperCase()}] | Município: ${municipio.nome} | Limite: ${limit}\n`;
    console.log(logMsg.trim());
    fs.writeFileSync(logFile, logMsg);
    
    isProcessing = true;

    // Passa os parâmetros via CLI para o script
    const cmd = `node "${scriptPath}" --limit=${limit} --municipio_id=${municipio.id} --url_base="${municipio.url_base}" --municipio_nome="${municipio.nome}"`;
    currentScrapeProcess = exec(cmd);
    
    currentScrapeProcess.stdout.on('data', (data) => fs.appendFileSync(logFile, data));
    currentScrapeProcess.stderr.on('data', (data) => fs.appendFileSync(logFile, `❌ ERRO: ${data}`));
    currentScrapeProcess.on('close', (code) => {
        isProcessing = false;
        currentScrapeProcess = null;
        let finalStatus = (code === null) ? 'Cancelado pelo usuário' : `(código ${code})`;
        const closeMsg = `\n🏁 [${new Date().toLocaleTimeString()}] Finalizado ${finalStatus}\n`;
        fs.appendFileSync(logFile, closeMsg);
    });

    res.json({ 
        message: `Raspagem de ${modulo} iniciada para ${municipio.nome}`, 
        script: path.basename(scriptPath) 
    });
});

// Endpoint para Cancelar Raspagem
app.post('/api/scrape/cancel', (req, res) => {
    if (!isProcessing || !currentScrapeProcess) {
        return res.status(400).json({ error: 'Não há raspagem em andamento para cancelar.' });
    }
    
    console.log('🛑 Cancelando raspagem em andamento...');
    fs.appendFileSync(logFile, '\n🛑 Solicitado cancelamento da raspagem...\n');
    
    // Mata o processo e todos os seus filhos (no Windows precisamos usar taskkill ou simplesmente child.kill)
    try {
        currentScrapeProcess.kill('SIGTERM');
        res.json({ message: 'Raspagem cancelada.' });
    } catch(err) {
        res.status(500).json({ error: 'Falha ao cancelar: ' + err.message });
    }
});

// Deletar item individual (Banco + Storage)
app.delete('/api/items', async (req, res) => {
    const { id, table, bucket, file_url } = req.query;

    if (!id || !table) {
        return res.status(400).json({ error: 'Faltam parâmetros: id, table' });
    }

    try {
        console.log(`🗑️ Deletando item ${id} da tabela ${table}...`);

        // 1. Deletar arquivo do Storage se houver URL
        if (file_url && bucket) {
            // Extrai o path do arquivo da URL do Supabase
            // Formato: .../storage/v1/object/public/BUCKET/FOLDER/FILE
            const pathParts = file_url.split(`${bucket}/`);
            if (pathParts.length > 1) {
                const filePath = decodeURIComponent(pathParts[1]);
                console.log(`   📁 Removendo arquivo do Storage: ${filePath}`);
                const { error: storageError } = await supabase.storage.from(bucket).remove([filePath]);
                if (storageError) console.error(`   ⚠️ Erro Storage:`, storageError.message);
            }
        }

        // 2. Deletar do Banco
        const { error: dbError } = await supabase.from(table).delete().eq('id', id);
        if (dbError) throw dbError;

        res.json({ message: 'Item e arquivo removidos com sucesso.' });
    } catch (err) {
        console.error('❌ Erro ao deletar item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Resetar Dados de forma granular (Banco + Storage)
app.delete('/api/clear-data', async (req, res) => {
    const { municipio_id, modulo, municipio_nome, delete_storage } = req.query;

    if (!municipio_id || !modulo || !municipio_nome) {
        return res.status(400).json({ error: 'Faltam parâmetros: municipio_id, modulo, municipio_nome' });
    }

    try {
        let table = 'tab_lrf';
        if (modulo === 'noticias') table = 'tab_noticias';
        else if (modulo === 'secretarias') table = 'tab_secretarias';
        
        // Supabase storage is case-sensitive, LRF folder is uppercase
        const folderName = modulo === 'lrf' ? 'LRF' : modulo;
        const folderPath = `${municipio_nome}/${folderName}`;
        const bucket = 'arquivos_municipais';

        console.log(`🗑️ Iniciando limpeza profunda [${modulo}] para [${municipio_nome}]...`);

        let storageCleared = 0;

        // 1. Limpar Storage (se solicitado)
        if (delete_storage === 'true') {
            // Lista arquivos recursivamente
            const { data: files, error: listError } = await supabase.storage.from(bucket).list(folderPath, { limit: 1000 });
            
            if (listError) {
                console.error(`⚠️ Erro ao listar arquivos para deletar:`, listError.message);
            } else if (files && files.length > 0) {
                const pathsToDelet = files.map(f => `${folderPath}/${f.name}`);
                const { error: removeError } = await supabase.storage.from(bucket).remove(pathsToDelet);
                if (removeError) {
                    console.error(`⚠️ Erro ao remover arquivos do Storage:`, removeError.message);
                } else {
                    storageCleared = files.length;
                    console.log(`✅ ${storageCleared} arquivos removidos do Storage.`);
                }
            }
        }

        // 2. Limpar Banco de Dados
        const { error: dbError } = await supabase
            .from(table)
            .delete()
            .eq('municipio_id', municipio_id);

        if (dbError) throw dbError;

        const logMsg = `🗑️ [${new Date().toLocaleTimeString()}] Limpeza de ${modulo.toUpperCase()} em ${municipio_nome} concluída.\n`;
        fs.appendFileSync(logFile, logMsg);
        
        res.json({ 
            message: `Dados limpos com sucesso.`,
            storageCleared
        });

    } catch (err) {
        console.error('❌ Erro na limpeza granular:', err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar item individual (Edição)
app.put('/api/items', async (req, res) => {
    const { id, table, data } = req.body;

    if (!id || !table || !data) {
        return res.status(400).json({ error: 'Faltam parâmetros: id, table, data' });
    }

    try {
        console.log(`✏️ Atualizando item ${id} na tabela ${table}...`);
        const { error } = await supabase.from(table).update(data).eq('id', id);
        if (error) throw error;

        console.log(`✅ Item ${id} atualizado com sucesso.`);
        res.json({ message: 'Item atualizado com sucesso.' });
    } catch (err) {
        console.error('❌ Erro ao atualizar item:', err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar status em lote (Bulk status update)
app.put('/api/items/status', async (req, res) => {
    const { ids, table, status } = req.body;

    if (!ids || !table || !status) {
        return res.status(400).json({ error: 'Faltam parâmetros: ids, table, status' });
    }

    try {
        console.log(`✏️ Atualizando status de ${ids.length} itens na tabela ${table} para '${status}'...`);
        const { error } = await supabase.from(table).update({ status }).in('id', ids);
        if (error) throw error;

        console.log(`✅ Status atualizado com sucesso para ${ids.length} itens.`);
        res.json({ message: 'Status atualizado com sucesso.' });
    } catch (err) {
        console.error('❌ Erro ao atualizar status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Ler Logs
app.get('/api/logs', (req, res) => {
    if (fs.existsSync(logFile)) {
        const logs = fs.readFileSync(logFile, 'utf8');
        res.json({ logs, isRunning: isProcessing });
    } else {
        res.json({ logs: 'Aguardando início...', isRunning: isProcessing });
    }
});

app.listen(port, () => {
    console.log(`📡 Backend API rodando em http://localhost:${port}`);
});
