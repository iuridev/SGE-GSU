"use client"; // Define que o código roda no lado do cliente (navegador)

import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react'; // Ícones para o visual
import { supabase } from '../lib/supabase'; // Importa a conexão com o banco
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  // Estados para capturar os dados do formulário e gerenciar o carregamento
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Função disparada ao clicar no botão "Entrar"
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Impede o recarregamento automático da página
    setLoading(true);   // Ativa o ícone de carregamento no botão
    setError('');       // Limpa erros anteriores

    console.log("--- INICIANDO LOGIN NO CLIENTE ---");

    try {
      // Tenta autenticar no Supabase com e-mail e senha
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Se o Supabase retornar um erro (senha errada, usuário não existe)
      if (authError) {
        console.error("Erro Supabase:", authError.message);
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      // Se o login funcionou e temos uma sessão
      if (data?.session) {
        console.log("Login OK! Gravando cookies e redirecionando...");
        
        // --- A CORREÇÃO CRUCIAL AQUI ---
        // Usamos window.location.href em vez de router.push.
        // Isso força o navegador a fazer uma requisição limpa para o servidor,
        // garantindo que o Middleware leia os cookies que o Supabase acabou de criar.
        window.location.href = '/'; 
      } else {
        console.warn("Nenhuma sessão retornada.");
        setLoading(false);
      }

    } catch (err: any) {
      // Captura erros inesperados (ex: falta de internet ou erro de código)
      console.error("Erro crítico na função:", err);
      setError("Falha na conexão com o servidor.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100">
        
        {/* Cabeçalho do Login */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acesso SGE-GSU</h1>
          <p className="text-slate-400 font-medium text-center">Digite suas credenciais para entrar</p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="E-mail" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none bg-slate-50 focus:border-blue-400 transition-all"
            required 
          />
          <input 
            type="password" 
            placeholder="Senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none bg-slate-50 focus:border-blue-400 transition-all"
            required 
          />
          
          {/* Alerta de Erro caso aconteça algo */}
          {error && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <div className="text-red-600 text-[10px] font-black uppercase text-center">{error}</div>
            </div>
          )}

          {/* Botão de Submissão com estado de Loading */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-lg shadow-blue-100 flex justify-center items-center gap-2 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:bg-slate-300"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span>Autenticando...</span>
              </div>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        {/* Rodapé informativo */}
        <p className="mt-6 text-[10px] text-center text-slate-300 uppercase font-bold tracking-widest">
            SGE-GSU • Gestão Segura de Usuários
        </p>
      </div>
    </div>
  );
}