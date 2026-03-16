# Sistema de Pedidos Online
Sistema web completo para realização e gerenciamento de pedidos online, com painel administrativo integrado e suporte a múltiplas formas de pagamento.
📋 Sobre o Projeto
O Sistema de Pedidos Online permite que clientes naveguem por um catálogo de produtos, montem seu pedido, escolham a forma de pagamento e finalizem a compra de forma simples e rápida. Cada pedido é enviado automaticamente para um painel administrativo em tempo real, onde o lojista pode acompanhar e gerenciar tudo em um só lugar.
# Funcionalidades

 Interface de compra — navegação por produtos e montagem do carrinho
 Múltiplas formas de pagamento — Pix (com QR Code), débito e crédito
 Geração de QR Code — para pagamentos via Pix em tempo real
 Painel Admin — visualização e gerenciamento de todos os pedidos
 Autenticação segura — login via conta Google (OAuth) no painel admin
 Tempo real — pedidos aparecem instantaneamente no painel via Firebase
 Gestão de status — admin pode marcar pedidos como "em preparo"
 Persistência de dados — todos os pedidos armazenados no Firebase Firestore

# Tecnologias Utilizadas
## Frontend

HTML5
CSS3
JavaScript (Vanilla)

## Backend

Node.js
API de geração de QR Code (Pix)

# Infraestrutura & Serviços

Firebase Firestore (banco de dados em tempo real)
Firebase Authentication (login com Google)
Firebase Hosting (opcional para deploy)

# Estrutura do Projeto
Site-Pedidos/
├── frontend/       # Interface de compra do cliente
├── backend/        # Servidor Node.js e integrações de API
└── admin/          # Painel administrativo
🔗 Demo
Acesse o projeto em produção: 🔗 Link do deploy

# O painel admin requer login com uma conta Google autorizada.

⚙️ Como Rodar Localmente
Pré-requisitos

Node.js instalado
Conta no Firebase com projeto configurado

Passo a passo
bash# 1. Clone o repositório
git clone https://github.com/Santosx-7/Site-Pedidos.git

# 2. Acesse a pasta do backend
cd Site-Pedidos/backend

# 3. Instale as dependências
npm install

# 4. Inicie o servidor
node server.js

Configure suas credenciais do Firebase no arquivo de configuração antes de rodar.

# Fluxo do Sistema
Cliente → Escolhe produtos → Seleciona pagamento → Preenche dados
                                                         ↓
Admin ← Painel em tempo real ← Firebase ← Pedido registrado
