

// ==========================================
// IMPORTS
// ==========================================
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS || './firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('✅ Firebase conectado com sucesso!');

// ==========================================
// CONFIGURAÇÃO DO SERVIDOR
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());



// ==========================================
// ROTAS DE TESTE
// ==========================================
app.get('/', (req, res) => {
  res.json({ 
    mensagem: '🎉 Servidor do Totem funcionando!',
    versao: '1.0.0',
    data: new Date().toLocaleString('pt-BR'),
    status: 'online',
    firebase: 'conectado'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    firebase: 'ok'
  });
});

// ==========================================
// ROTAS DE PRODUTOS (COM FIREBASE)
// ==========================================

// Listar todos os produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').where('ativo', '==', true).get();
    
    if (snapshot.empty) {
      return res.json({ 
        sucesso: true,
        produtos: [],
        mensagem: 'Nenhum produto cadastrado ainda'
      });
    }
    
    const produtos = [];
    snapshot.forEach(doc => {
      produtos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ 
      sucesso: true,
      produtos: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao buscar produtos',
      detalhes: error.message
    });
  }
});

// Buscar produto específico
app.get('/api/produtos/:id', async (req, res) => {
  try {
    const doc = await db.collection('produtos').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        sucesso: false, 
        erro: 'Produto não encontrado' 
      });
    }
    
    res.json({ 
      sucesso: true, 
      produto: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// Criar produto (admin)
app.post('/api/produtos', async (req, res) => {
  try {
    const { nome, preco, estoque, imagem } = req.body;
    
    if (!nome || !preco) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Nome e preço são obrigatórios' 
      });
    }
    
    const novoProduto = {
      nome,
      preco: parseFloat(preco),
      estoque: estoque || 0,
      imagem: imagem || '',
      ativo: true,
      dataCriacao: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('produtos').add(novoProduto);
    
    res.json({ 
      sucesso: true,
      mensagem: 'Produto criado com sucesso!',
      produtoId: docRef.id
    });
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// Atualizar estoque
app.patch('/api/produtos/:id/estoque', async (req, res) => {
  try {
    const { quantidade } = req.body;
    
    if (quantidade === undefined) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Quantidade é obrigatória' 
      });
    }
    
    await db.collection('produtos').doc(req.params.id).update({
      estoque: parseInt(quantidade),
      dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      sucesso: true,
      mensagem: 'Estoque atualizado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar estoque:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// ==========================================
// ROTAS DE PEDIDOS (COM FIREBASE)
// ==========================================

app.post('/api/pedidos', async (req, res) => {
  try {
    const { cliente, itens, pagamento, total } = req.body;

    if (!cliente || !itens || !pagamento) {
      return res.status(400).json({ sucesso: false, erro: 'Dados incompletos' });
    }

    const numeroPedido = '#' + Date.now().toString().slice(-6);

    // Busca os docs dos produtos antes da transaction
    const produtoDocs = [];
    for (const item of itens) {
      const snap = await db.collection('produtos')
        .where('nome', '==', item.nome).limit(1).get();
      if (!snap.empty) produtoDocs.push({ doc: snap.docs[0], item });
    }

    await db.runTransaction(async (t) => {
      // Valida e reserva estoque dentro da transaction
      for (const { doc, item } of produtoDocs) {
        const produto = doc.data();
        if (produto.estoque < item.quantidade) {
          throw new Error(`Estoque insuficiente para ${item.nome}. Disponível: ${produto.estoque}`);
        }
        t.update(doc.ref, { estoque: produto.estoque - item.quantidade });
      }

      // Cria o pedido dentro da mesma transaction
      const pedidoRef = db.collection('pedidos').doc();
      t.set(pedidoRef, {
        numero: numeroPedido,
        cliente,
        itens,
        pagamento,
        total: parseFloat(total),
        status: 'pendente',
        dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
        dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log('📦 Novo pedido criado:', numeroPedido);

    res.json({
      sucesso: true,
      mensagem: 'Pedido criado com sucesso!',
      pedido: { numero: numeroPedido, status: 'pendente' }
    });

  } catch (error) {
    console.error('❌ Erro ao criar pedido:', error);
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

// Listar pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = db.collection('pedidos').orderBy('dataCriacao', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.limit(50).get();
    
    const pedidos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      pedidos.push({
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao?.toDate().toISOString()
      });
    });
    
    res.json({ 
      sucesso: true,
      pedidos,
      total: pedidos.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar pedidos:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// Buscar pedido por número
app.get('/api/pedidos/:numero', async (req, res) => {
  try {
    const snapshot = await db.collection('pedidos')
      .where('numero', '==', req.params.numero)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        sucesso: false, 
        erro: 'Pedido não encontrado' 
      });
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    res.json({ 
      sucesso: true,
      pedido: {
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao?.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedido:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// Atualizar status do pedido
app.patch('/api/pedidos/:numero/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const statusValidos = ['pendente', 'preparando', 'pronto', 'entregue', 'cancelado'];
    
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Status inválido',
        statusValidos 
      });
    }
    
    const snapshot = await db.collection('pedidos')
      .where('numero', '==', req.params.numero)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        sucesso: false, 
        erro: 'Pedido não encontrado' 
      });
    }
    
    await snapshot.docs[0].ref.update({
      status,
      dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`📝 Pedido ${req.params.numero} → ${status}`);
    
    res.json({ 
      sucesso: true,
      mensagem: `Status atualizado para: ${status}`
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ 
      sucesso: false, 
      erro: error.message 
    });
  }
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================
app.use((req, res) => {
  res.status(404).json({ 
    sucesso: false,
    erro: 'Rota não encontrada',
    rota: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).json({ 
    sucesso: false,
    erro: 'Erro interno do servidor'
  });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
  console.log('========================================');
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔥 Firebase: Conectado`);
  console.log(`🕒 ${new Date().toLocaleString('pt-BR')}`);
  console.log('========================================');
  console.log('');
});