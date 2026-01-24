"use client"; // Indica que este componente roda no navegador (interação do usuário)
import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, X } from 'lucide-react'; // Ícones
import { supabase } from './lib/supabase'; // Nossa conexão com o banco
import { useRouter } from 'next/navigation'; // Para mudar de página (redirecionar)

export default function UserManagement() {
  const router = useRouter(); // Inicializa o roteador do Next.js

  // --- ESTADOS (Memória do Componente) ---
  const [isModalOpen, setIsModalOpen] = useState(false); // Controla se o modal de cadastro aparece
  const [loading, setLoading] = useState(false); // Status de salvamento (girar o ícone no botão)
  const [loadingUser, setLoadingUser] = useState(true); // Status de carregamento inicial da página
  const [usuarios, setUsuarios] = useState<any[]>([]); // Guarda a lista de usuários vinda do banco
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null); // Guarda os dados de quem logou

  // --- ESTADOS DO FORMULÁRIO (Campos de texto) ---
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('Escola');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // --- EFEITO INICIAL (Roda assim que a página abre) ---
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      setLoadingUser(true); // Começa a mostrar a tela de carregamento
      
      // 1. Pede ao Supabase a sessão do usuário atual
      const { data: { session } } = await supabase.auth.getSession();

      // Se não houver sessão, manda o usuário para a tela de login
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Busca na tabela 'usuarios' o perfil do e-mail que está logado
      const { data: userData } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('email', session.user.email)
        .single(); // Pega apenas um resultado

      // Salva no estado se o usuário é Administrador (Regional)
      setUsuarioLogado({
        email: session.user.email,
        is_admin: userData?.perfil === 'Regional' 
      });

      // 3. Busca a lista de todos os usuários para mostrar na tabela
      await fetchUsuarios();
      setLoadingUser(false); // Esconde a tela de carregamento
    };

    checkUserAndFetchData();
  }, [router]); // O 'router' aqui é uma dependência do efeito

  // --- FUNÇÃO PARA BUSCAR DADOS NO BANCO ---
  const fetchUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false }); // Do mais novo para o mais antigo

    if (data) setUsuarios(data); // Atualiza a lista na tela
  };

  // --- FUNÇÃO DE LOGOUT ---
  const handleLogout = async () => {
    await supabase.auth.signOut(); // Finaliza a sessão no Supabase
    router.push('/login'); // Vai para o login
  };

  // --- FUNÇÃO PARA SALVAR NOVO USUÁRIO ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); // Impede a página de recarregar ao enviar o formulário
    setLoading(true);
    setError("");

    // Validação básica de senha
    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      setLoading(false);
      return;
    }

    // Insere os dados na tabela 'usuarios' do Supabase
    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{ nome, email, perfil }]);

    if (insertError) {
      setError("Erro ao salvar: " + insertError.message);
    } else {
      setIsModalOpen(false); // Fecha o modal
      setNome(''); setEmail(''); setPassword(''); setConfirmPassword(''); // Limpa campos
      fetchUsuarios(); // Recarrega a tabela
      alert("Usuário salvo com sucesso!");
    }
    setLoading(false);
  };

  // --- TELA DE CARREGAMENTO (Enquanto verifica o login) ---
  if (loadingUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // --- INTERFACE (HTML/JSX) ---
  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* SIDEBAR (Barra Lateral) */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold tracking-tight">SGE-GSU</span>
        </div>
        
        <nav className="space-y-4 flex-1">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium">
            <Users size={20} /> <span>Usuários</span>
          </div>
        </nav>

        {/* Botão de Sair */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
        >
          <LogOut size={20} /> <span>Sair</span>
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Gestão de Usuários</h1>
            <p className="text-slate-500">Controle de acesso ao sistema</p>
          </div>

          {/* RENDERIZAÇÃO CONDICIONAL: Só mostra se for is_admin */}
          {usuarioLogado?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-700 transition flex items-center gap-2 font-bold"
            >
              <Plus size={20} /> Novo Usuário
            </button>
          )}
        </header>

        {/* TABELA DE DADOS */}
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Nome</th>
                <th className="px-8 py-5">E-mail</th>
                <th className="px-8 py-5">Perfil</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-sm">
              {/* Percorre o array de usuários e cria uma linha para cada um */}
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-6 text-slate-700 font-bold">{user.nome}</td>
                  <td className="px-8 py-6 text-slate-500">{user.email}</td>
                  <td className="px-8 py-6">
                    {/* Estilo diferente baseado no perfil */}
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={async () => {
                        if(confirm("Deseja realmente excluir este usuário?")) {
                          await supabase.from('usuarios').delete().eq('id', user.id);
                          fetchUsuarios(); // Atualiza a lista após deletar
                        }
                      }}
                      className="text-red-500 font-bold hover:text-red-700 transition"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL DE CADASTRO (Só aparece se isModalOpen for true) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md">
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900">Novo Cadastro</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSave}>
                  <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none" required />
                  <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none" required />
                  
                  {/* Grid para senhas lado a lado */}
                  <div className="grid grid-cols-2 gap-4">
                    <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none" required />
                    <input type="password" placeholder="Confirmar" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none" required />
                  </div>

                  <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold">
                    <option value="Escola">Escola</option>
                    <option value="Regional">Regional</option>
                  </select>

                  {error && <div className="text-red-600 text-[10px] font-black uppercase text-center">{error}</div>}

                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs disabled:bg-slate-300">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finalizar Registro'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}