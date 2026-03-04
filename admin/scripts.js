// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCzNrz4u5aKKfO1jPffjldlLuouKlxs894",
  authDomain: "totem-festa.firebaseapp.com",
  projectId: "totem-festa",
  storageBucket: "totem-festa.firebasestorage.app",
  messagingSenderId: "484720837609",
  appId: "1:484720837609:web:40aca57d1f2c75f5fbc178"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

console.log('✅ Firebase conectado!');

// ==========================================
// EMAILS AUTORIZADOS
// Adicione aqui os emails da equipe que podem acessar o painel
// ==========================================
const EMAILS_AUTORIZADOS = [
  'danielreidosjogos@gmail.com',      // ← troque pelos emails reais da equipe
  'countryfest.adm@gmail.com'
];

// ==========================================
// URL DO BACKEND
// Trocar para o IP da máquina no dia do evento (ex: http://192.168.1.10:3000)
// ==========================================
const API_URL = 'http://127.0.0.1:3000';

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
let todosPedidos = [];
let filtroAtivo = 'pendente';
let listenerPedidos = null;

// ==========================================
// AUTENTICAÇÃO GOOGLE
// ==========================================
function fazerLoginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then((resultado) => {
      const email = resultado.user.email;

      if (!EMAILS_AUTORIZADOS.includes(email)) {
        // Email não autorizado — faz logout imediatamente
        auth.signOut();
        document.getElementById('login-erro').style.display = 'block';
        document.getElementById('login-erro').textContent = `❌ ${email} não tem acesso. Contate o responsável.`;
        console.warn('🚫 Acesso negado para:', email);
        return;
      }

      console.log('✅ Login autorizado:', email);
    })
    .catch((error) => {
      console.error('❌ Erro no login:', error);
      document.getElementById('login-erro').style.display = 'block';
      document.getElementById('login-erro').textContent = '❌ Erro ao fazer login. Tente novamente.';
    });
}

function fazerLogout() {
  if (listenerPedidos) {
    listenerPedidos(); // cancela o listener do Firestore
    listenerPedidos = null;
  }
  auth.signOut().then(() => {
    console.log('👋 Logout realizado');
  });
}

// ==========================================
// OBSERVER DE AUTENTICAÇÃO
// Controla qual tela mostrar
// ==========================================
auth.onAuthStateChanged((usuario) => {
  const telaLogin = document.getElementById('tela-login');
  const painelAdmin = document.getElementById('painel-admin');

  if (usuario && EMAILS_AUTORIZADOS.includes(usuario.email)) {
    // Autenticado e autorizado
    telaLogin.style.display = 'none';
    painelAdmin.style.display = 'block';

    // Mostra info do usuário no header
    document.getElementById('usuario-nome').textContent = usuario.displayName || usuario.email;
    if (usuario.photoURL) {
      const foto = document.getElementById('usuario-foto');
      foto.src = usuario.photoURL;
      foto.style.display = 'block';
    }

    // Inicia o listener de pedidos
    iniciarListenerPedidos();

  } else {
    // Não autenticado ou não autorizado
    telaLogin.style.display = 'flex';
    painelAdmin.style.display = 'none';

    // Para o listener se existir
    if (listenerPedidos) {
      listenerPedidos();
      listenerPedidos = null;
    }
  }
});

// ==========================================
// BUSCAR PEDIDOS EM TEMPO REAL
// ==========================================
function iniciarListenerPedidos() {
  listenerPedidos = db.collection('pedidos')
    .orderBy('dataCriacao', 'desc')
    .onSnapshot((snapshot) => {
      console.log('📦 Pedidos atualizados!');

      todosPedidos = [];

      snapshot.forEach((doc) => {
        const pedido = {
          id: doc.id,
          ...doc.data(),
          dataCriacao: doc.data().dataCriacao?.toDate()
        };
        todosPedidos.push(pedido);
      });

      atualizarInterface();

      if (snapshot.docChanges().some(change => change.type === 'added')) {
        notificar('🔔 Novo pedido recebido!');
      }
    }, (error) => {
      console.error('❌ Erro ao buscar pedidos:', error);
      mostrarErro('Erro ao carregar pedidos. Verifique a conexão.');
    });
}

// ==========================================
// ATUALIZAR INTERFACE
// ==========================================
function atualizarInterface() {
  atualizarEstatisticas();
  atualizarContadores();
  renderizarPedidos();
}

// ==========================================
// ESTATÍSTICAS (HEADER)
// ==========================================
function atualizarEstatisticas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const pedidosHoje = todosPedidos.filter(p => {
    if (!p.dataCriacao) return false;
    const dataPedido = new Date(p.dataCriacao);
    dataPedido.setHours(0, 0, 0, 0);
    return dataPedido.getTime() === hoje.getTime();
  });

  const totalPedidos = pedidosHoje.length;
  const totalFaturamento = pedidosHoje.reduce((acc, p) => acc + (p.total || 0), 0);
  const pedidosPendentes = todosPedidos.filter(p => p.status === 'pendente').length;

  const stats = document.querySelectorAll('.stat-item .stat-value');
  if (stats[0]) stats[0].textContent = totalPedidos;
  if (stats[1]) stats[1].textContent = 'R$ ' + totalFaturamento.toFixed(2);
  if (stats[2]) stats[2].textContent = pedidosPendentes;
}

// Atualiza relógio a cada minuto
setInterval(() => {
  const agora = new Date();
  const horas = agora.getHours().toString().padStart(2, '0');
  const minutos = agora.getMinutes().toString().padStart(2, '0');
  const el = document.getElementById('horaAtual');
  if (el) el.textContent = `${horas}:${minutos}`;
}, 60000);

// ==========================================
// CONTADORES DOS FILTROS
// ==========================================
function atualizarContadores() {
  const contadores = {
    pendente: todosPedidos.filter(p => p.status === 'pendente').length,
    preparando: todosPedidos.filter(p => p.status === 'preparando').length,
    pronto: todosPedidos.filter(p => p.status === 'pronto').length,
    entregue: todosPedidos.filter(p => p.status === 'entregue').length
  };

  document.querySelectorAll('.filtro-btn[data-status]').forEach(btn => {
    const status = btn.dataset.status;
    if (status && status !== 'todos') {
      const emoji = btn.dataset.emoji;
      const nome = btn.dataset.nome;
      btn.textContent = `${emoji} ${nome} (${contadores[status] || 0})`;
    }
  });
}

// ==========================================
// RENDERIZAR PEDIDOS
// ==========================================
function renderizarPedidos() {
  const grid = document.querySelector('.pedidos-grid');

  let pedidosFiltrados = todosPedidos;
  if (filtroAtivo !== 'todos') {
    pedidosFiltrados = todosPedidos.filter(p => p.status === filtroAtivo);
  }

  grid.innerHTML = '';

  if (pedidosFiltrados.length === 0) {
    grid.innerHTML = `
      <div class="mensagem-inicial">
        <p>📦 Nenhum pedido ${filtroAtivo !== 'todos' ? filtroAtivo : ''}</p>
        <small>Os pedidos aparecerão aqui em tempo real</small>
      </div>
    `;
    return;
  }

  pedidosFiltrados.forEach(pedido => {
    const card = criarCardPedido(pedido);
    grid.appendChild(card);
  });
}

// ==========================================
// CRIAR CARD DO PEDIDO
// ==========================================
function criarCardPedido(pedido) {
  const div = document.createElement('div');
  div.className = `card ${pedido.status}`;
  div.dataset.pedidoId = pedido.id;

  const tempoDecorrido = calcularTempoDecorrido(pedido.dataCriacao);

  const itensHTML = pedido.itens.map(item =>
    `<p>• ${item.quantidade}x ${item.nome} (R$ ${(item.preco * item.quantidade).toFixed(2)})</p>`
  ).join('');

  let botoesHTML = '';
  if (pedido.status === 'pendente') {
    botoesHTML = `<button class="btn btn-preparar" onclick="atualizarStatus('${pedido.numero}', 'preparando')">▶️ Preparar</button>`;
  } else if (pedido.status === 'preparando') {
    botoesHTML = `<button class="btn btn-pronto" onclick="atualizarStatus('${pedido.numero}', 'pronto')">✅ Marcar Pronto</button>`;
  } else if (pedido.status === 'pronto') {
    botoesHTML = `<button class="btn btn-entregar" onclick="atualizarStatus('${pedido.numero}', 'entregue')">🚀 Entregar</button>`;
  }

  div.innerHTML = `
    <div class="card-header">
      <span class="pedido-numero">${pedido.numero}</span>
      <span class="pedido-status">${pedido.status.toUpperCase()}</span>
    </div>
    <div class="card-body">
      <div class="info-linha">
        <span>👤 <strong>${pedido.cliente.nome}</strong></span>
      </div>
      <div class="info-linha">
        <span>📍 ${pedido.cliente.mesa}</span>
        <span>⏰ ${tempoDecorrido}</span>
      </div>
      <div class="itens">
        <p class="itens-titulo">Itens:</p>
        ${itensHTML}
      </div>
      <div class="total">
        <span>💰 Total: <strong>R$ ${pedido.total.toFixed(2)}</strong></span>
      </div>
      <div class="pagamento">
        <span>💳 ${pedido.pagamento.metodo.toUpperCase()}</span>
      </div>
    </div>
    <div class="card-footer">
      ${botoesHTML}
      <button class="btn btn-cancelar" onclick="cancelarPedido('${pedido.numero}')" title="Cancelar pedido">❌</button>
    </div>
  `;

  return div;
}

// ==========================================
// ATUALIZAR STATUS DO PEDIDO
// ==========================================
async function atualizarStatus(numeroPedido, novoStatus) {
  try {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error('Não autenticado');

    const token = await usuario.getIdToken();
const response = await fetch(`${API_URL}/api/pedidos/${encodeURIComponent(numeroPedido)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token  // envia token Firebase para o backend verificar
      },
      body: JSON.stringify({ status: novoStatus })
    });

    const resultado = await response.json();

    if (!resultado.sucesso) throw new Error(resultado.erro);

    notificar(`✅ Pedido ${numeroPedido} → ${novoStatus.toUpperCase()}`);

  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    alert('Erro ao atualizar status: ' + error.message);
  }
}

// ==========================================
// CANCELAR PEDIDO
// ==========================================
async function cancelarPedido(numeroPedido) {
  if (!confirm(`Cancelar pedido ${numeroPedido}?`)) return;
  await atualizarStatus(numeroPedido, 'cancelado');
}

// ==========================================
// FILTROS
// ==========================================
document.querySelectorAll('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = btn.dataset.status || 'todos';
    renderizarPedidos();
  });
});

// ==========================================
// UTILITÁRIOS
// ==========================================
function calcularTempoDecorrido(data) {
  if (!data) return 'agora';
  const diff = Math.floor((new Date() - new Date(data)) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} dias`;
}

function notificar(mensagem) {
  const notif = document.createElement('div');
  notif.className = 'notificacao mostrar';
  notif.textContent = mensagem;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.classList.remove('mostrar');
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function mostrarErro(mensagem) {
  const grid = document.querySelector('.pedidos-grid');
  grid.innerHTML = `
    <div class="mensagem-inicial" style="color: #ff4757;">
      <p>❌ ${mensagem}</p>
    </div>
  `;
}