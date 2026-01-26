# 🏫 SGE-GSU | Sistema de Gestão Escolar e Zeladorias

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PDF Generation](https://img.shields.io/badge/PDF_Export-jsPDF-red?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)

> **Unidade Regional de Ensino Guarulhos Sul**
>
> Sistema moderno para administração de escolas e gestão completa do ciclo de vida de processos de ocupação de zeladorias, com controle de fluxo, alertas de vencimento e relatórios institucionais.

---

## 🚀 Novidades da Versão 2.0

-   **📄 Exportação PDF Profissional:** Relatórios em modo paisagem com cabeçalho institucional oficial.
-   **📊 Dashboard Analítico:** Gráficos de distribuição por etapas e funil de processos.
-   **📢 Modo Apresentação:** Página dedicada para apresentar o sistema a stakeholders e diretoria.
-   **🔍 Filtros Avançados:** Busca dinâmica por Escola, Diretor, Polo e Etapas do processo.
-   **✏️ Edição Admin:** Permite ao administrador corrigir dados sensíveis de processos em andamento.

---

## 📸 Funcionalidades Principais

### 1. 📊 Dashboard Gerencial Inteligente
Uma visão "bata o olho e decida":
-   **KPIs em Tempo Real:** Totalizadores de processos, ocupações vigentes e isenções.
-   **Gráfico de Funil:** Visualização clara de quantos processos estão travados em cada etapa.
-   **Alertas de Vencimento:** Monitoramento automático (Regra: Data Casa Civil + 2 Anos).
    -   🔴 **Crítico:** Vencidos.
    -   🟠 **Atenção:** Vencem em menos de 90 dias.
    -   🟢 **Ok:** Vencimento distante.

### 2. 🏠 Módulo de Zeladorias (Workflow)
Controle rigoroso das 7 etapas administrativas:
1.  **Processo SEI** 📄
2.  **Vistoria e Fotos** 📸
3.  **Análise SEFISC** 🔍
4.  **Laudo CECIG** 📝
5.  **Ciência do Valor** 💰
6.  **Aut. Casa Civil** 🏛️
7.  **Assinatura do Termo** ✍️

> **Destaque:** Linha do tempo visual (Stepper) que mostra o progresso exato de cada solicitação.

### 3. 🖨️ Motor de Relatórios
-   Geração de PDF *Client-Side* instantânea.
-   Layout **Paisagem (Landscape)** para melhor visualização de dados.
-   Cabeçalho Padronizado: *Diretoria de Ensino / Serviço de Obras / Seção de Fiscalização*.
-   Rodapé com data/hora da emissão e paginação automática.

### 4. 👥 Gestão de Acesso (RBAC)
-   **Perfil Regional (Admin):** Visão de helicóptero. Acessa todas as escolas, edita processos, gera relatórios globais.
-   **Perfil Operacional:** Visão focada. Acessa apenas os dados da sua unidade escolar (Protegido por Row Level Security no Banco).

---

## 🛠️ Tecnologias Utilizadas

-   **Frontend:** [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
-   **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
-   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
-   **Ícones:** [Lucide React](https://lucide.dev/)
-   **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL)
-   **Relatórios:** `jspdf` & `jspdf-autotable`

---

## 🚀 Instalação e Execução

### Pré-requisitos
-   Node.js 18+
-   Conta no Supabase (Projeto configurado)

### 1. Clonar o repositório
```bash
git clone [https://github.com/seu-usuario/sge-gsu.git](https://github.com/seu-usuario/sge-gsu.git)
cd sge-gsu

2. Instalar dependências
Bash
npm install
# ou
yarn install
3. Variáveis de Ambiente
Crie um arquivo .env.local na raiz:

Snippet de código
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_secreta
Nota: A SERVICE_ROLE_KEY é usada apenas no servidor (actions.ts) para gestão de usuários.

4. Rodar o projeto
Bash
npm run dev
Acesse http://localhost:3000.

📂 Estrutura do Projeto
src/
├── app/
│   ├── actions.ts       # Server Actions (Lógica Segura de Backend)
│   ├── page.tsx         # Dashboard Principal
│   ├── apresentacao/    # Landing Page de Apresentação do Sistema
│   ├── escolas/         # CRUD de Escolas
│   ├── zeladorias/      # Listagem, Filtros e PDF de Processos
│   ├── login/           # Autenticação
│   └── lib/             # Cliente Supabase
└── public/              # Assets

🤝 Contribuição
O projeto foi desenvolvido com foco em escalabilidade. Para adicionar novos módulos (ex: "Obras" ou "Merenda"):

Crie a tabela no Supabase.

Crie a rota em src/app/novo-modulo.

Adicione as Server Actions em actions.ts.

Desenvolvido para modernizar a Gestão Pública. 