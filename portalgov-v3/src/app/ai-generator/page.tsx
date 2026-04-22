"use client";

import OpenAI from 'openai';
import React, { useState } from 'react';
import { Sparkles, Download, Trash2, Send, Code, Eye, Laptop } from 'lucide-react';

const deepseek = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
  dangerouslyAllowBrowser: true
});

export default function AIGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  async function generatePage() {
    if (!prompt.trim()) {
      setError('Descreva o que você deseja criar.');
      return;
    }

    setGenerating(true);
    setError('');
    
    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Você é um Engenheiro de Prompt e Designer UI/UX Elite. 
            Sua tarefa é gerar o código HTML completo de uma página web moderna, responsiva e visualmente impressionante.
            REGRAS:
            1. Use apenas Tailwind CSS (via CDN) para estilização.
            2. Use fontes do Google Fonts (Inter, Outfit ou Roboto).
            3. Use ícones da biblioteca Lucide ou FontAwesome (via CDN).
            4. Garanta que o design seja "Premium Corporate" ou "Modern SaaS".
            5. Retorne APENAS o código HTML completo dentro das tags <html>.`
          },
          {
            role: 'user',
            content: `Crie uma página web com o seguinte tema e requisitos: ${prompt}`
          }
        ],
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content || '';
      const htmlMatch = content.match(/<html[\s\S]*<\/html>/i);
      setGeneratedCode(htmlMatch ? htmlMatch[0] : content);
      setViewMode('preview');
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com a API do DeepSeek.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  function downloadHTML() {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-ai-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: 'calc(100vh - 100px)' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 12px #8b5cf6' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              Next-Gen AI Labs
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', margin: 0 }}>
            Gerador de Layouts Inteligente
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
            Crie interfaces completas em segundos usando DeepSeek V3.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: generatedCode ? '380px 1fr' : '1fr', gap: '2rem', flex: 1, minHeight: 0 }}>
        
        {/* ── Coluna de Entrada ────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Sparkles size={18} />
            </div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>O que vamos criar hoje?</h3>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Landing page para secretaria de saúde, tons de verde, grid de serviços e área de notícias..."
            style={{
              flex: 1, width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: '1rem', fontSize: '0.875rem', color: '#1e293b',
              resize: 'none', outline: 'none', transition: 'border-color 0.2s',
              lineHeight: 1.6
            }}
            onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />

          {error && (
            <div style={{ padding: '0.75rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', fontSize: '0.75rem' }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={generatePage}
            disabled={generating}
            style={{ background: '#8b5cf6', justifyContent: 'center', padding: '0.875rem' }}
          >
            {generating ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Processando...
              </>
            ) : (
              <>
                <Send size={16} />
                Gerar com IA
              </>
            )}
          </button>
        </div>

        {/* ── Coluna de Preview ────────────────────────────────────────────── */}
        {generatedCode && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setViewMode('preview')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
                    fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: viewMode === 'preview' ? '#fff' : 'transparent',
                    color: viewMode === 'preview' ? '#8b5cf6' : '#64748b',
                    boxShadow: viewMode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
                    fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: viewMode === 'code' ? '#fff' : 'transparent',
                    color: viewMode === 'code' ? '#8b5cf6' : '#64748b',
                    boxShadow: viewMode === 'code' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Code size={14} /> Código
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.7rem' }} onClick={downloadHTML}>
                  <Download size={14} /> Baixar
                </button>
                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fee2e2' }} onClick={() => setGeneratedCode('')}>
                  <Trash2 size={14} /> Limpar
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              {viewMode === 'preview' ? (
                <iframe
                  srcDoc={generatedCode}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="AI Generated Layout"
                />
              ) : (
                <pre style={{
                  margin: 0, padding: '1.5rem', height: '100%', overflow: 'auto',
                  fontSize: '0.8rem', color: '#475569', background: '#fff',
                  fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6
                }}>
                  {generatedCode}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}