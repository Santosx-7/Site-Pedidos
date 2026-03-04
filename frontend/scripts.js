document.addEventListener('DOMContentLoaded', function () {

  // ==========================================
  // ELEMENTOS DO DOM
  // ==========================================
  const botoesProduto = document.querySelectorAll(".botao-produto");
  const listaCarrinho = document.getElementById("lista-carrinho");
  const totalCarrinho = document.getElementById("total-carrinho");
  const carrinho = document.getElementById("carrinho");
  const btnAbrirCarrinho = document.getElementById("btnAbrirCarrinho");
  const btnFecharCarrinho = document.getElementById("btnFecharCarrinho");
  const overlayCarrinho = document.getElementById("overlayCarrinho");
  const badgeCarrinho = document.getElementById("badgeCarrinho");

  const checkout = document.getElementById('checkout');
  const btnFecharCheckout = document.getElementById('btnFecharCheckout');
  const listaResumo = document.getElementById('listaResumo');
  const totalResumo = document.getElementById('totalResumo');
  const btnConfirmarPedido = document.getElementById('btnConfirmarPedido');
  const metodosBtns = document.querySelectorAll('.metodo-btn');
  const formularioDinamico = document.getElementById('formularioDinamico');
  const nomeCliente = document.getElementById('nomeCliente');
  const mesaCliente = document.getElementById('mesaCliente');
  const confirmacaoOverlay = document.getElementById('confirmacaoOverlay');
  const confirmacaoTitulo = document.getElementById('confirmacaoTitulo');
  const confirmacaoMensagem = document.getElementById('confirmacaoMensagem');
  const numeroPedido = document.getElementById('numeroPedido');
  const btnOkConfirmacao = document.getElementById('btnOkConfirmacao');

  let carrinhoItens = [];
  let metodoSelecionado = null;

  // ==========================================
  // FUNÇÕES PIX
  // ==========================================
  function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function campo(id, valor) {
    const tamanho = valor.length.toString().padStart(2, '0');
    return id + tamanho + valor;
  }

  function crc16(payload) {
    const polinomio = 0x1021;
    let resultado = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
      resultado ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        resultado = (resultado & 0x8000) 
          ? ((resultado << 1) ^ polinomio) & 0xFFFF
          : (resultado << 1) & 0xFFFF;
      }
    }
    return resultado.toString(16).toUpperCase().padStart(4, '0');
  }

  function gerarPixEMV(chave, nome, cidade, valor) {
    const nomeNormalizado = removerAcentos(nome).substring(0, 25);
    const cidadeNormalizada = removerAcentos(cidade).substring(0, 15);
    const valorFormatado = valor.toFixed(2);
    const txid = 'PED' + Date.now().toString().slice(-10);

    const payload =
      campo('00', '01') +
      campo('01', '12') +
      campo('26',
        campo('00', 'BR.GOV.BCB.PIX') +
        campo('01', chave)
      ) +
      campo('52', '0000') +
      campo('53', '986') +
      campo('54', valorFormatado) +
      campo('58', 'BR') +
      campo('59', nomeNormalizado) +
      campo('60', cidadeNormalizada) +
      campo('62',
        campo('05', txid)
      );

    const payloadComCRC = payload + '6304';
    const crc = crc16(payloadComCRC);
    
    console.log('PIX EMV gerado:', payloadComCRC + crc);
    return payloadComCRC + crc;
  }

  // ==========================================
  // FUNÇÕES DO CARRINHO
  // ==========================================
  function calcularTotalCarrinho() {
    return carrinhoItens.reduce((t, p) => t + (p.preco * p.quantidade), 0);
  }

  function abrirCarrinho() {
    carrinho.classList.add('aberto');
    overlayCarrinho.classList.add('ativo');
    document.body.style.overflow = 'hidden';
  }

  function fecharCarrinho() {
    carrinho.classList.remove('aberto');
    overlayCarrinho.classList.remove('ativo');
    document.body.style.overflow = '';
  }

  function adicionarAoCarrinho(nome, preco) {
    const item = carrinhoItens.find(p => p.nome === nome);
    if (item) {
      item.quantidade++;
    } else {
      carrinhoItens.push({ nome, preco, quantidade: 1 });
    }
  }

  function atualizarCarrinho() {
    listaCarrinho.innerHTML = '';
    let totalItens = 0;
    let total = 0;

    carrinhoItens.forEach((p, i) => {
      const subtotal = p.preco * p.quantidade;
      total += subtotal;
      totalItens += p.quantidade;

      const li = document.createElement('li');
      li.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${p.nome}</div>
          <div style="font-size:14px;color:#666">${p.quantidade} × R$ ${p.preco.toFixed(2)}</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span style="font-weight:700;color:#5457ff">R$ ${subtotal.toFixed(2)}</span>
          <button class="botao-remover" data-index="${i}">✕</button>
        </div>
      `;
      listaCarrinho.appendChild(li);
    });

    totalCarrinho.textContent = 'Total: R$ ' + total.toFixed(2);
    
    const titulo = document.querySelector('.carrinho-header h2');
    if (titulo) {
      titulo.textContent = totalItens > 0 ? `Carrinho (${totalItens})` : 'Carrinho';
    }
    
    badgeCarrinho.textContent = totalItens;
    badgeCarrinho.classList.toggle('oculto', totalItens === 0);
    
    const btnFinalizar = document.querySelector('.botao-finalizar');
    if (btnFinalizar) {
      btnFinalizar.disabled = carrinhoItens.length === 0;
    }
  }

  // ==========================================
  // EVENTOS DOS PRODUTOS
  // ==========================================
  botoesProduto.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.item');
      adicionarAoCarrinho(
        item.querySelector('h2').textContent, 
        parseFloat(item.dataset.preco)
      );
      atualizarCarrinho();
      
      btn.style.background = '#3a3dfd';
      setTimeout(() => btn.style.background = '#5457ff', 200);
      
      btnAbrirCarrinho.classList.add('pulse');
      setTimeout(() => btnAbrirCarrinho.classList.remove('pulse'), 400);
    });
  });

  if (listaCarrinho) {
    listaCarrinho.addEventListener('click', e => {
      if (e.target.classList.contains('botao-remover')) {
        const i = parseInt(e.target.dataset.index);
        if (carrinhoItens[i].quantidade > 1) {
          carrinhoItens[i].quantidade--;
        } else {
          carrinhoItens.splice(i, 1);
        }
        atualizarCarrinho();
      }
    });
  }

  // ==========================================
  // CHECKOUT
  // ==========================================
  const botaoFinalizarGlobal = document.querySelector('.botao-finalizar');
  if (botaoFinalizarGlobal) {
    botaoFinalizarGlobal.addEventListener('click', () => {
      if (carrinhoItens.length > 0) {
        fecharCarrinho();
        if (checkout) checkout.classList.add('aberto');
        preencherResumo();
        resetarFormulario();
      }
    });
  }

  function preencherResumo() {
    if (listaResumo) listaResumo.innerHTML = '';
    carrinhoItens.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="produto-info">
          <div class="produto-nome">${p.nome}</div>
          <div class="produto-quantidade">${p.quantidade}x R$ ${p.preco.toFixed(2)}</div>
        </div>
        <div class="produto-preco">R$ ${(p.preco * p.quantidade).toFixed(2)}</div>
      `;
      listaResumo.appendChild(li);
    });
    if (totalResumo) totalResumo.textContent = 'R$ ' + calcularTotalCarrinho().toFixed(2);
  }

  function resetarFormulario() {
    if (nomeCliente) nomeCliente.value = '';
    if (mesaCliente) mesaCliente.value = '';
    metodoSelecionado = null;
    metodosBtns.forEach(b => b.classList.remove('ativo'));
    if (formularioDinamico) formularioDinamico.innerHTML = '<p class="texto-info">👆 Selecione uma forma de pagamento</p>';
    if (btnConfirmarPedido) btnConfirmarPedido.disabled = true;
  }

  // ==========================================
  // MÉTODOS DE PAGAMENTO
  // ==========================================
  metodosBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      metodosBtns.forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      metodoSelecionado = btn.dataset.metodo;

      if (metodoSelecionado === 'pix') {
        const total = calcularTotalCarrinho();
        
        const CHAVE_PIX = '55716057000183';
        const NOME_BENEFICIARIO = 'Igreja Nova Alianca de Arapongas';
        const CIDADE = 'Arapongas';
        
        const pixCode = gerarPixEMV(CHAVE_PIX, NOME_BENEFICIARIO, CIDADE, total);
        const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

        formularioDinamico.innerHTML = `
          <h4 style="margin: 0 0 16px 0; color: #333;">Pagamento via PIX</h4>
          <div style="text-align:center">
            <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 16px;">
              <img src="${qrCodeURL}" style="width:250px;height:250px;display:block;">
            </div>
            <p style="font-size: 18px; font-weight: 700; color: #5457ff; margin: 16px 0;">
              Valor: R$ ${total.toFixed(2)}
            </p>
            <p style="color: #666; font-size: 14px; margin: 16px 0 8px;">
              Ou copie o código PIX:
            </p>
            <textarea 
              readonly 
              style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-family:monospace;font-size:12px;resize:none;height:100px;"
              onclick="this.select();document.execCommand('copy');alert('Código PIX copiado!')"
            >${pixCode}</textarea>
            <p style="font-size: 12px; color: #999; margin-top: 8px;">
              👆 Clique para copiar o código
            </p>
          </div>
        `;
      } else if (metodoSelecionado === 'cartao') {
        formularioDinamico.innerHTML = `
          <h4 style="margin: 0 0 16px 0; color: #333;">💳 Cartão de Crédito/Débito</h4>
          <div style="background: #e3f2fd; padding: 24px; border-radius: 12px; text-align: center;">
            <p style="font-size: 16px; margin-bottom: 16px;">
              O pagamento será realizado no momento da <strong>retirada do pedido</strong>
            </p>
            <p style="font-size: 14px; color: #666;">
              📍 Tenha seu cartão em mãos<br>
              🏪 Pagamento na maquininha do estabelecimento
            </p>
          </div>
        `;
      } else if (metodoSelecionado === 'dinheiro') {
        formularioDinamico.innerHTML = `
          <h4 style="margin: 0 0 16px 0; color: #333;">Pagamento em Dinheiro</h4>
          <div class="campo">
            <label>Troco para quanto? (opcional)</label>
            <input type="number" id="trocoValor" placeholder="Ex: 50.00" step="0.01" min="0" style="padding:12px;border:2px solid #e0e0e0;border-radius:8px;font-size:16px;width:100%;">
            <p style="font-size: 13px; color: #666; margin: 8px 0 0;">
              💡 Deixe em branco se não precisar de troco
            </p>
          </div>
        `;
      }

      validar();
    });
  });

  function validar() {
    const nomeOk = nomeCliente && nomeCliente.value && nomeCliente.value.trim();
    const mesaOk = mesaCliente && mesaCliente.value && mesaCliente.value.trim();
    if (btnConfirmarPedido) btnConfirmarPedido.disabled = !(nomeOk && mesaOk && metodoSelecionado);
  }

  if (nomeCliente) nomeCliente.addEventListener('input', validar);
  if (mesaCliente) mesaCliente.addEventListener('input', validar);

  // ==========================================
  // CONFIRMAR PEDIDO
  // ==========================================
  if (btnConfirmarPedido) {
    btnConfirmarPedido.addEventListener('click', async () => {
    try {
        btnConfirmarPedido.disabled = true;
        btnConfirmarPedido.textContent = 'Processando...';
      
      const dadosPedido = {
        cliente: {
          nome: nomeCliente.value.trim(),
          mesa: mesaCliente.value.trim()
        },
        itens: carrinhoItens,
        pagamento: {
          metodo: metodoSelecionado,
          detalhes: {}
        },
        total: calcularTotalCarrinho()
      };
      
      console.log('📤 Enviando pedido:', dadosPedido);
      
      const response = await fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosPedido)
      });
      
      const resultado = await response.json();
      
      console.log('📥 Resposta do servidor:', resultado);
      
      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro ao criar pedido');
      }
      
        if (confirmacaoTitulo) confirmacaoTitulo.textContent = (nomeCliente ? nomeCliente.value : '') + ', seu pedido foi feito!';
        if (confirmacaoMensagem) confirmacaoMensagem.textContent = 'Mesa/Local: ' + (mesaCliente ? mesaCliente.value : '');
        if (numeroPedido) numeroPedido.textContent = resultado.pedido.numero;
        if (confirmacaoOverlay) confirmacaoOverlay.classList.add('ativo');
        document.body.style.overflow = 'hidden';
      
      console.log('✅ Pedido criado com sucesso:', resultado.pedido.numero);
      
      } catch (error) {
      console.error('❌ Erro ao enviar pedido:', error);
      alert('❌ Erro: ' + error.message + '\n\nVerifique se o servidor está rodando!');
    } finally {
      btnConfirmarPedido.disabled = false;
      btnConfirmarPedido.textContent = 'Confirmar Pedido';
    }
    });
  }

  if (btnOkConfirmacao) {
    btnOkConfirmacao.addEventListener('click', () => {
      if (confirmacaoOverlay) confirmacaoOverlay.classList.remove('ativo');
      if (checkout) checkout.classList.remove('aberto');
      carrinhoItens = [];
      atualizarCarrinho();
      document.body.style.overflow = '';
    });
  }

  // ==========================================
  // EVENTOS GERAIS
  // ==========================================
  if (btnAbrirCarrinho) btnAbrirCarrinho.addEventListener('click', abrirCarrinho);
  if (btnFecharCarrinho) btnFecharCarrinho.addEventListener('click', fecharCarrinho);
  if (btnFecharCheckout) btnFecharCheckout.addEventListener('click', () => { if (checkout) checkout.classList.remove('aberto'); });
  if (overlayCarrinho) overlayCarrinho.addEventListener('click', fecharCarrinho);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (checkout.classList.contains('aberto')) {
        checkout.classList.remove('aberto');
      } else if (carrinho.classList.contains('aberto')) {
        fecharCarrinho();
      }
    }
  });

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================
  atualizarCarrinho();
  console.log('✅ Sistema iniciado!');

});