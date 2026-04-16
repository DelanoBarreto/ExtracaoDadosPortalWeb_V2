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
    res.json({ noticias: noticias || 0, lrf: lrf || 0 });
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

// Executar Scraper
app.post('/api/scrape', (req, res) => {
    if (isProcessing) {
        return res.status(400).json({ error: 'Uma raspagem já está em andamento.' });
    }

    const { modulo = 'noticias', municipio_id, limit = 20 } = req.body;

    // Mapeia explicitamente o módulo para o script correto
    const SCRIPT_MAP = {
        'noticias':  '../raspar-noticias-v2.js',
        'lrf':       '../raspar-lrf.js',
        'decretos':  '../raspar-decretos.js',
        'leis':      '../raspar-leis.js',
    };
    const targetScript = SCRIPT_MAP[modulo];
    if (!targetScript) {
        return res.status(400).json({ error: `Módulo '${modulo}' não possui script mapeado ainda.` });
    }
    const scriptPath = path.join(__dirname, targetScript);
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ error: `Script não encontrado: ${path.basename(scriptPath)}` });
    }

    const logMsg = `🚀 [${new Date().toLocaleTimeString()}] Módulo: [${modulo.toUpperCase()}]${municipio_id ? ` | municipio_id: ${municipio_id}` : ''} | Limite: ${limit}\n`;
    console.log(logMsg.trim());
    fs.writeFileSync(logFile, logMsg);
    
    isProcessing = true;

    const childProcess = exec(`node "${scriptPath}" --limit=${limit}`);
    childProcess.stdout.on('data', (data) => fs.appendFileSync(logFile, data));
    childProcess.stderr.on('data', (data) => fs.appendFileSync(logFile, `❌ ERRO: ${data}`));
    childProcess.on('close', (code) => {
        isProcessing = false;
        const closeMsg = `\n🏁 [${new Date().toLocaleTimeString()}] Finalizado (código ${code})\n`;
        fs.appendFileSync(logFile, closeMsg);
    });

    res.json({ message: `Raspagem de ${modulo} iniciada`, script: path.basename(scriptPath) });
});

// Resetar Dados de forma granular (Banco + Storage)
app.delete('/api/clear-data', async (req, res) => {
    const { municipio_id, modulo, municipio_nome, delete_storage } = req.query;

    if (!municipio_id || !modulo || !municipio_nome) {
        return res.status(400).json({ error: 'Faltam parâmetros: municipio_id, modulo, municipio_nome' });
    }

    try {
        const table = modulo === 'noticias' ? 'tab_noticias' : 'tab_lrf';
        // Supabase storage is case-sensitive, LRF folder is uppercase
        const folderName = modulo === 'lrf' ? 'LRF' : modulo;
        const folderPath = `${municipio_nome}/${folderName}`;
        const bucket = 'arquivos_municipais';

        console.log(`🗑️ Iniciando limpeza profunda [${modulo}] para [${municipio_nome}]...`);

        let storageCleared = 0;

        // 1. Limpar Storage (se solicitado)
        if (delete_storage === 'true') {
            const { data: files, error: listError } = await supabase.storage.from(bucket).list(folderPath);
            
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
