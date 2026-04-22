import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Variáveis persistentes em memória por sessão do servidor
let currentProcess: any = null;
let isProcessing = false;
const logFile = path.join(process.cwd(), '../last-run.log');

export async function GET() {
  try {
    if (!fs.existsSync(logFile)) {
      return NextResponse.json({ logs: 'Aguardando início...', isRunning: isProcessing });
    }
    const logs = fs.readFileSync(logFile, 'utf8');
    return NextResponse.json({ logs, isRunning: isProcessing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Endpoint para cancelar a raspagem (Botão Abortar)
export async function DELETE() {
  if (currentProcess && isProcessing) {
    try {
      // Mata o processo e todos os seus descendentes (em Windows pode precisar de taskkill)
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', currentProcess.pid.toString(), '/f', '/t']);
      } else {
        currentProcess.kill('SIGTERM');
      }
      
      isProcessing = false;
      currentProcess = null;
      
      const logMsg = `\n🛑 [${new Date().toLocaleTimeString()}] OPERAÇÃO ABORTADA PELO USUÁRIO.\n`;
      fs.appendFileSync(logFile, logMsg);
      
      return NextResponse.json({ message: 'Processo encerrado com sucesso.' });
    } catch (e: any) {
      return NextResponse.json({ error: 'Falha ao encerrar processo: ' + e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Nenhum processo ativo para abortar.' }, { status: 400 });
}

export async function POST(request: Request) {
  if (isProcessing) {
    return NextResponse.json({ error: 'Uma raspagem já está em andamento.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { modulo = 'noticias', municipio_id, limit = 20 } = body;

    if (!municipio_id) {
      return NextResponse.json({ error: 'municipio_id é obrigatório.' }, { status: 400 });
    }

    // Busca dados do município para passar as URLs corretas
    const { data: municipio, error: munError } = await supabaseAdmin
      .from('tab_municipios')
      .select('*')
      .eq('id', municipio_id)
      .single();

    if (munError || !municipio) {
      return NextResponse.json({ error: 'Município não encontrado ou erro no banco.' }, { status: 404 });
    }

    const SCRIPT_MAP: Record<string, string> = {
      'noticias': 'scrape-noticias.js',
      'lrf': 'scrape-lrf.js',
      'secretarias': 'scrape-secretarias.js',
    };

    const targetScript = SCRIPT_MAP[modulo];
    if (!targetScript) {
      return NextResponse.json({ error: `Módulo '${modulo}' não mapeado.` }, { status: 400 });
    }

    // Resolvendo de forma segura para evitar problemas do Turbopack
    const baseDir = process.cwd();
    const crawlerPath = path.resolve(baseDir, '..', 'crawler', 'scripts', targetScript);
    
    if (!fs.existsSync(crawlerPath)) {
      return NextResponse.json({ error: `Script não encontrado na nova estrutura V4: ${targetScript}` }, { status: 404 });
    }

    const logMsg = `🚀 [${new Date().toLocaleTimeString()}] INICIANDO: [${modulo.toUpperCase()}] | Limite: ${limit} | Município: ${municipio.nome}\n`;
    fs.writeFileSync(logFile, logMsg);
    
    isProcessing = true;

    // Dispara o processo
    currentProcess = spawn('node', [
      crawlerPath,
      `--limit=${limit}`,
      `--municipio_id=${municipio.id}`,
      `--url_base=${municipio.url_base}`,
      `--municipio_nome=${municipio.nome}`
    ]);

    // Captura logs em tempo real para o arquivo de log
    currentProcess.stdout.on('data', (data: any) => {
      fs.appendFileSync(logFile, data.toString());
    });

    currentProcess.stderr.on('data', (data: any) => {
      fs.appendFileSync(logFile, `ERROR: ${data.toString()}`);
    });

    currentProcess.on('close', (code: number) => {
      isProcessing = false;
      currentProcess = null;
      fs.appendFileSync(logFile, `\n✅ [${new Date().toLocaleTimeString()}] FINALIZADO (Código: ${code})\n`);
    });

    return NextResponse.json({ 
      message: `Raspagem de ${modulo} iniciada.`,
      isRunning: true
    });

  } catch (error: any) {
    isProcessing = false;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
