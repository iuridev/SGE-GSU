"use client";
import React, { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Credenciais inválidas.");
      setLoading(false);
      return;
    }

    if (data?.session) {
      // Força o navegador a enviar os novos cookies para o Middleware
      window.location.href = '/';
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-black text-center mb-6">SGE-GSU LOGIN</h1>
        <input type="email" placeholder="E-mail" onChange={(e)=>setEmail(e.target.value)} className="w-full mb-4 p-4 rounded-2xl border" required />
        <input type="password" placeholder="Senha" onChange={(e)=>setPassword(e.target.value)} className="w-full mb-4 p-4 rounded-2xl border" required />
        {error && <p className="text-red-500 text-sm mb-4 text-center font-bold">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold uppercase">
          {loading ? 'Entrando...' : 'Acessar Sistema'}
        </button>
      </form>
    </div>
  );
}