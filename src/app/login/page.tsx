"use client";
import React, { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // LOG 1: Início do processo
    console.log("--- INICIANDO TENTATIVA DE LOGIN ---");
    console.log("E-mail digitado:", email);

    try {
      // LOG 2: Chamando o Supabase
      console.log("Chamando supabase.auth.signInWithPassword...");
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // LOG 3: Erro retornado pelo Supabase (ex: senha errada)
        console.error("Erro retornado pelo Supabase:", authError.status, authError.message);
        setError("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      // LOG 4: Sucesso na autenticação
      if (data?.session) {
        console.log("Login bem-sucedido! Sessão criada para:", data.user?.email);
        console.log("Redirecionando para a Home...");
        router.push('/'); 
      } else {
        console.warn("Login concluído, mas nenhuma sessão foi retornada.");
        setLoading(false);
      }

    } catch (err: any) {
      // LOG 5: Erro crítico (Geralmente variáveis de ambiente faltando)
      console.error("ERRO CRÍTICO NO LOGIN:");
      console.error("Mensagem do erro:", err.message);
      console.error("Stack trace:", err);
      
      setError("Erro de conexão. Verifique as chaves do banco.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acesso SGE-GSU</h1>
          <p className="text-slate-400 font-medium">Faça login para gerenciar usuários</p>
        </div>

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
          
          {error && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <div className="text-red-600 text-[10px] font-black uppercase text-center">{error}</div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-lg shadow-blue-100 flex justify-center items-center gap-2 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>

        {/* LOG DE STATUS NA TELA (Opcional, ajuda a ver se o código travou) */}
        <p className="mt-4 text-[10px] text-center text-slate-300 uppercase font-bold">
            Status: {loading ? 'Conectando ao banco...' : 'Aguardando login'}
        </p>
      </div>
    </div>
  );
}