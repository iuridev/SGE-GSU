"use client";
import React, { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // Caminho corrigido com @ conforme erro

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Tenta autenticar
    const { data, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setError("Credenciais inválidas ou erro de conexão.");
      setLoading(false);
      return;
    }

    if (data?.session) {
      // Usa window.location para garantir que o Middleware receba os novos cookies
      window.location.href = '/';
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900">SGE-GSU LOGIN</h1>
          <p className="text-slate-400 text-sm font-medium">Digite suas credenciais para entrar</p>
        </div>
        
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" 
          required 
        />
        
        <input 
          type="password" 
          placeholder="Senha" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" 
          required 
        />

        {error && <p className="text-red-500 text-[10px] mb-4 text-center font-black uppercase tracking-widest">{error}</p>}
        
        <button 
          disabled={loading} 
          className="w-full bg-blue-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:bg-slate-300"
        >
          {loading ? 'Validando...' : 'Acessar Sistema'}
        </button>
      </form>
    </div>
  );
}