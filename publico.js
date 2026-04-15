/* ── publico.js — Página de registro e consulta ── */

document.addEventListener('DOMContentLoaded', () => {
  // Preenche a data com hoje automaticamente
  const inputData = document.getElementById('data');
  if (inputData) inputData.value = new Date().toISOString().split('T')[0];

  carregarUltimasOcorrencias();
});

// ── Registro de ocorrência ────────────────────────────────────────────────

async function registrarOcorrencia() {
  const campos = {
    data:      document.getElementById('data').value,
    empresa:   document.getElementById('empresa').value,
    escala:    document.getElementById('escala').value.trim(),
    garagem:   document.getElementById('garagem').value,
    veiculo:   document.getElementById('veiculo').value.trim(),
    motivo:    document.getElementById('motivo').value,
    descricao: document.getElementById('descricao').value.trim(),
  };

  const erroDiv = document.getElementById('formError');
  const obrigatorios = ['data', 'empresa', 'escala', 'garagem', 'veiculo', 'motivo'];
  const faltando = obrigatorios.some(c => !campos[c]);

  if (faltando) {
    erroDiv.style.display = 'block';
    setTimeout(() => erroDiv.style.display = 'none', 3000);
    return;
  }

  const btn = document.getElementById('btnRegistrar');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  btn.disabled = true;

  try {
    const res    = await fetch('/api/registrar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(campos),
    });
    const result = await res.json();

    if (result.success) {
      mostrarSucesso(result.protocolo, campos);
      carregarUltimasOcorrencias();
      mostrarToast('Ocorrência registrada com sucesso!');
    } else {
      mostrarToast('Erro: ' + result.message);
    }
  } catch {
    mostrarToast('Erro de conexão. Tente novamente.');
  } finally {
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Registrar Ocorrência';
    btn.disabled = false;
  }
}

function mostrarSucesso(protocolo, campos) {
  document.getElementById('protocoloDisplay').textContent = protocolo;
  document.getElementById('summaryBox').innerHTML = `
    <div class="info-row"><span class="info-label">Data</span>
      <span class="info-value">${campos.data.split('-').reverse().join('/')}</span></div>
    <div class="info-row"><span class="info-label">Empresa</span>
      <span class="info-value">${campos.empresa}</span></div>
    <div class="info-row"><span class="info-label">Operador</span>
      <span class="info-value">${campos.escala}</span></div>
    <div class="info-row"><span class="info-label">Veículo</span>
      <span class="info-value">${campos.veiculo}</span></div>
    <div class="info-row"><span class="info-label">Motivo</span>
      <span class="info-value">${campos.motivo}</span></div>
    <div class="info-row"><span class="info-label">Status</span>
      <span class="info-value"><span class="badge badge-pending">Aguardando resposta</span></span></div>
  `;
  document.getElementById('form-body').style.display  = 'none';
  document.getElementById('successBox').style.display = 'block';
}

function novoRegistro() {
  document.getElementById('form-body').style.display  = 'block';
  document.getElementById('successBox').style.display = 'none';

  document.getElementById('data').value       = new Date().toISOString().split('T')[0];
  document.getElementById('escala').value     = '';
  document.getElementById('veiculo').value    = '';
  document.getElementById('descricao').value  = '';
  ['empresa', 'garagem', 'motivo'].forEach(id =>
    document.getElementById(id).selectedIndex = 0
  );
}

// ── Consulta de protocolo ─────────────────────────────────────────────────

async function consultarProtocolo() {
  const proto     = document.getElementById('consultaProto').value.trim().toUpperCase();
  const resultDiv = document.getElementById('resultadoConsulta');

  if (!proto) { resultDiv.style.display = 'none'; return; }

  resultDiv.innerHTML = '<div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Consultando...</div>';
  resultDiv.style.display = 'block';

  try {
    const res    = await fetch(`/api/consultar/${proto}`);
    const result = await res.json();

    if (result.success) {
      resultDiv.innerHTML = renderConsulta(result.dados);
    } else {
      resultDiv.innerHTML = `<p style="color:#E54D2E;text-align:center;padding:20px">${result.message}</p>`;
    }
  } catch {
    resultDiv.innerHTML = '<p style="color:#E54D2E;text-align:center;padding:20px">Erro ao consultar</p>';
  }
}

function renderConsulta(o) {
  const respondida = o.status === 'Respondida';
  const badgeClass = respondida ? 'badge-answered' : 'badge-pending';

  let respostasHtml = '';
  if (o.respostas && o.respostas.length) {
    respostasHtml = `
      <div style="margin-top:16px">
        <strong style="font-size:12px">📬 Respostas da administração:</strong>
        ${o.respostas.map(r => `
          <div class="response-item">
            <div style="font-size:11px;color:#8B8B85;margin-bottom:6px">${r.data} · ${r.respondido_por}</div>
            <div style="font-size:13px">${r.mensagem}</div>
          </div>
        `).join('')}
      </div>`;
  }

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <strong style="font-family:monospace;font-size:14px;color:#FFD43B">${o.protocolo}</strong>
      <span class="badge ${badgeClass}">${o.status}</span>
    </div>
    <div class="info-row"><span class="info-label">Data</span><span class="info-value">${o.data_formatada}</span></div>
    <div class="info-row"><span class="info-label">Empresa</span><span class="info-value">${o.empresa}</span></div>
    <div class="info-row"><span class="info-label">Operador</span><span class="info-value">${o.escala}</span></div>
    <div class="info-row"><span class="info-label">Veículo</span><span class="info-value">${o.veiculo}</span></div>
    <div class="info-row"><span class="info-label">Motivo</span><span class="info-value">${o.motivo}</span></div>
    ${o.descricao ? `<div class="info-row"><span class="info-label">Descrição</span><span class="info-value">${o.descricao}</span></div>` : ''}
    ${respostasHtml}
  `;
}

// ── Últimas ocorrências ───────────────────────────────────────────────────

async function carregarUltimasOcorrencias() {
  const lista = document.getElementById('listaOcorrencias');
  try {
    const res    = await fetch('/api/ultimas');
    const result = await res.json();

    if (result.success && result.dados.length) {
      lista.innerHTML = result.dados.map(p => `
        <div class="ultima-item" onclick="preencherConsulta('${p.protocolo}')">
          <div style="font-weight:600;font-family:monospace;color:#FFD43B;font-size:12px">${p.protocolo}</div>
          <div style="font-size:11px;color:#8B8B85">${p.data} · ${p.motivo.substring(0,40)}</div>
        </div>
      `).join('');
    } else {
      lista.innerHTML = '<p style="text-align:center;padding:20px;font-size:13px;color:#8B8B85">Nenhuma ocorrência registrada</p>';
    }
  } catch {
    lista.innerHTML = '<p style="color:#E54D2E;font-size:13px;text-align:center">Erro ao carregar</p>';
  }
}

function preencherConsulta(protocolo) {
  document.getElementById('consultaProto').value = protocolo;
  consultarProtocolo();
}

// ── Toast ─────────────────────────────────────────────────────────────────

function mostrarToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
