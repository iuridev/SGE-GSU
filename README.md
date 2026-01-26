# 🏫 SGE-GSU | Sistema de Gestão Escolar e Zeladorias

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

> Um sistema robusto para administração de escolas e gestão completa de processos de ocupação de zeladorias, com controle de fluxo, alertas de vencimento e perfis de acesso hierárquicos.

---

## 📸 Visão Geral

O **SGE-GSU** foi desenvolvido para modernizar o acompanhamento de processos administrativos em escolas estaduais/municipais. O foco principal é o módulo de **Zeladorias**, que permite acompanhar a ocupação de imóveis funcionais através de um fluxo de aprovação de 7 etapas, desde o processo SEI até a assinatura do termo.

### 🌟 Funcionalidades Principais

#### 1. 📊 Dashboard Gerencial
- **Visão Macro:** Cards com totalizadores de processos, status em andamento, concluídos e isentos de pagamento.
- **Alertas Inteligentes:** Monitoramento automático de contratos vencendo (Validade de 2 anos).
- **Notificações Visuais:** Indicadores de cor (Verde/Laranja/Vermelho) baseados na urgência.

#### 2. 🏠 Módulo de Zeladorias (Workflow)
- **Stepper Visual:** Linha do tempo interativa mostrando o progresso do processo.
- **7 Etapas de Controle:**
  1. Processo SEI 📄
  2. Vistoria e Relatório Fotográfico 📸
  3. Análise do SEFISC 🔍
  4. Laudo do CECIG 📝
  5. Ciência do Valor Locativo 💰
  6. Autorização da Casa Civil 🏛️
  7. Assinatura do Termo ✍️
- **Controle de Isenção:** Flag para zeladores isentos de pagamento de locação.
- **Edição e Arquivamento:** Controle total para administradores corrigirem dados ou arquivarem processos antigos.

#### 3. 👥 Gestão de Usuários e Permissões (RBAC)
- **Perfil Regional (Admin):** Acesso total, pode criar escolas, usuários e gerenciar todos os processos.
- **Perfil Operacional:** Visualiza apenas os dados da escola à qual está vinculado (Segurança via Row Level Security).
- **Gestão de Acesso:** Criação de usuários, reset de senha e bloqueio de acesso.

#### 4. 🏫 Cadastro de Escolas
- Gestão completa de unidades escolares.
- Organização por **Polos Regionais**.
- Filtros avançados por Nome, Polo ou Diretor.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [Next.js 14](https://nextjs.org/) (App Router & Server Components)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Server Actions:** Para mutações de dados seguras no lado do servidor.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 18+
- Conta no Supabase

### 1. Clone o repositório
```bash
git clone [https://github.com/seu-usuario/sge-gsu.git](https://github.com/seu-usuario/sge-gsu.git)
cd sge-gsu


2. Instale as dependências
Bash
npm install

3. Configuração de Ambiente (.env.local)
Crie um arquivo .env.local na raiz do projeto com as chaves do Supabase.

⚠️ Importante: A chave SUPABASE_SERVICE_ROLE_KEY é necessária para funções administrativas (criar/deletar usuários). Nunca exponha essa chave no lado do cliente (NEXT_PUBLIC).

Snippet de código
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_secreta

4. Configuração do Banco de Dados
Execute os scripts SQL no painel do Supabase para criar as tabelas (usuarios, escolas, zeladorias) e configurar as Policies (RLS).

(Consulte a documentação interna ou os arquivos de migração para o schema exato).

5. Execute o servidor de desenvolvimento
Bash
npm run dev
Acesse http://localhost:3000.

📂 Estrutura do Projeto
src/
├── app/
│   ├── actions.ts       # Server Actions (Lógica de Backend)
│   ├── layout.tsx       # Layout Global
│   ├── page.tsx         # Dashboard Principal
│   ├── login/           # Página de Login
│   ├── escolas/         # Gestão de Escolas
│   ├── zeladorias/      # Gestão de Zeladorias
│   └── lib/             # Cliente Supabase
├── components/          # Componentes Reutilizáveis (se houver)
└── public/              # Assets estáticos
🔐 Segurança e Performance
Server-Side Rendering (SSR): Carregamento rápido e SEO otimizado.

Middleware: Proteção de rotas para garantir que apenas usuários logados acessem o sistema.

Supabase Auth: Gerenciamento seguro de sessões.

Service Role: Operações críticas (como criar usuários no Auth) são executadas no servidor com privilégios elevados, longe do browser.

🤝 Contribuição
Faça um Fork do projeto

Crie uma Branch para sua Feature (git checkout -b feature/NovaFeature)

Faça o Commit (git commit -m 'Add: Nova Feature')

Faça o Push (git push origin feature/NovaFeature)

Abra um Pull Request