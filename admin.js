/* ── admin.js — Painel Administrativo ── */

let ocorrenciasAtuais    = [];
let ocorrenciasFiltradas = [];
let protocoloAtual       = null;

document.addEventListener('DOMContentLoaded', () => {
  carregarOcorrencias();
  setInterval(carregarOcorrencias, 30000);
});

// ── Carregamento e renderização ───────────────────────────────────────────

async function carregarOcorrencias() {
  try {
    const res    = await fetch('/api/admin/ocorrencias');
    const result = await res.json();
    if (!result.success) return;

    ocorrenciasAtuais    = result.dados;
    ocorrenciasFiltradas = [...ocorrenciasAtuais];
    atualizarStats();
    renderizarTabela(ocorrenciasFiltradas);
  } catch (e) {
    console.error('Erro ao carregar ocorrências:', e);
  }
}

function atualizarStats() {
  const total     = ocorrenciasAtuais.length;
  const pendentes = ocorrenciasAtuais.filter(o => o.status !== 'Respondida').length;
  document.getElementById('totalCount').textContent    = total;
  document.getElementById('pendingCount').textContent  = pendentes;
  document.getElementById('answeredCount').textContent = total - pendentes;
}

function renderizarTabela(lista) {
  const tbody = document.getElementById('tabelaOcorrencias');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#8B8B85">Nenhuma ocorrência encontrada</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(o => {
    const respondida = o.status === 'Respondida';
    return `
      <tr>
        <td><code style="font-size:12px;color:#FFD43B">${o.protocolo}</code></td>
        <td>${o.data}</td>
        <td>${o.empresa}</td>
        <td>${o.escala}</td>
        <td>${o.veiculo}</td>
        <td>${o.motivo}</td>
        <td><span class="badge ${respondida ? 'badge-answered' : 'badge-pending'}">${o.status}</span></td>
        <td>
          <button class="btn-ver"       onclick="abrirModalVisualizar('${o.protocolo}')"><i class="fas fa-eye"></i> Ver</button>
          <button class="btn-responder" onclick="abrirModalResposta('${o.protocolo}')"><i class="fas fa-reply"></i> Responder</button>
        </td>
      </tr>`;
  }).join('');
}

// ── Filtros ───────────────────────────────────────────────────────────────

function aplicarFiltros() {
  const proto  = document.getElementById('filterProtocolo').value.trim().toUpperCase();
  const status = document.getElementById('filterStatus').value;
  const inicio = document.getElementById('filterDataInicio').value;
  const fim    = document.getElementById('filterDataFim').value;

  ocorrenciasFiltradas = ocorrenciasAtuais.filter(o => {
    if (proto  && !o.protocolo.includes(proto))           return false;
    if (status && o.status !== status)                    return false;
    if (inicio && o.data_iso < inicio)                    return false;
    if (fim    && o.data_iso > fim)                       return false;
    return true;
  });

  renderizarTabela(ocorrenciasFiltradas);

  const badge = document.getElementById('filtroAtivoBadge');
  const ativos = [proto, status, inicio, fim].filter(Boolean).length;
  if (ativos) {
    badge.textContent  = `${ativos} filtro(s) ativo(s)`;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function limparFiltros() {
  ['filterProtocolo', 'filterDataInicio', 'filterDataFim'].forEach(id =>
    document.getElementById(id).value = ''
  );
  document.getElementById('filterStatus').selectedIndex = 0;
  document.getElementById('filtroAtivoBadge').style.display = 'none';
  ocorrenciasFiltradas = [...ocorrenciasAtuais];
  renderizarTabela(ocorrenciasFiltradas);
}

// ── Modal: Visualizar ─────────────────────────────────────────────────────

function abrirModalVisualizar(protocolo) {
  const o = ocorrenciasAtuais.find(x => x.protocolo === protocolo);
  if (!o) return;

  protocoloAtual = protocolo;
  const respondida = o.status === 'Respondida';

  let respostasHtml = '';
  if (o.respostas && o.respostas.length) {
    respostasHtml = `
      <div class="detail-section">
        <div class="detail-title"><i class="fas fa-comments"></i> Respostas (${o.respostas.length})</div>
        ${o.respostas.map(r => `
          <div class="response-item">
            <div style="font-size:11px;color:#8B8B85;margin-bottom:4px">${r.data} · ${r.respondido_por}</div>
            <div style="font-size:13px">${r.mensagem}</div>
          </div>
        `).join('')}
      </div>`;
  }

  document.getElementById('visualizarBody').innerHTML = `
    <div class="detail-section">
      <div class="detail-title"><i class="fas fa-info-circle"></i> Informações gerais</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Protocolo</div>
          <div class="detail-value" style="font-family:monospace">${o.protocolo}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div>
          <div class="detail-value"><span class="badge ${respondida ? 'badge-answered' : 'badge-pending'}">${o.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Data</div><div class="detail-value">${o.data}</div></div>
        <div class="detail-item"><div class="detail-label">Horário</div><div class="detail-value">${o.horario}</div></div>
        <div class="detail-item"><div class="detail-label">Empresa</div><div class="detail-value">${o.empresa}</div></div>
        <div class="detail-item"><div class="detail-label">Garagem</div><div class="detail-value">${o.garagem}</div></div>
        <div class="detail-item"><div class="detail-label">Operador</div><div class="detail-value">${o.escala}</div></div>
        <div class="detail-item"><div class="detail-label">Veículo</div><div class="detail-value">${o.veiculo}</div></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-title"><i class="fas fa-tag"></i> Classificação</div>
      <div class="detail-value">${o.motivo}</div>
      ${o.descricao ? `<div class="descricao-box" style="margin-top:10px">${o.descricao}</div>` : ''}
    </div>
    ${respostasHtml}
  `;

  document.getElementById('modalVisualizar').style.display = 'flex';
}

function fecharModalVisualizar() {
  document.getElementById('modalVisualizar').style.display = 'none';
}

function responderDaVisualizacao() {
  fecharModalVisualizar();
  abrirModalResposta(protocoloAtual);
}

// ── Modal: Responder ──────────────────────────────────────────────────────

function abrirModalResposta(protocolo) {
  const o = ocorrenciasAtuais.find(x => x.protocolo === protocolo);
  if (!o) return;

  protocoloAtual = protocolo;
  document.getElementById('modalProtocolo').value = protocolo;
  document.getElementById('respostaTexto').value  = '';

  document.getElementById('modalDetalhes').innerHTML = `
    <strong>${o.motivo}</strong> · ${o.data} · ${o.empresa} · Veículo ${o.veiculo}
    ${o.descricao ? `<br><em style="color:#6B6B65;font-size:12px">${o.descricao}</em>` : ''}
  `;

  const hist = document.getElementById('respostasAnteriores');
  if (o.respostas && o.respostas.length) {
    hist.innerHTML = `
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">Histórico de respostas:</div>
      ${o.respostas.map(r => `
        <div class="response-item">
          <div style="font-size:11px;color:#8B8B85">${r.data} · ${r.respondido_por}</div>
          <div style="font-size:13px;margin-top:4px">${r.mensagem}</div>
        </div>
      `).join('')}`;
  } else {
    hist.innerHTML = '';
  }

  document.getElementById('modalResposta').style.display = 'flex';
}

async function enviarResposta() {
  const resposta = document.getElementById('respostaTexto').value.trim();
  const status   = document.getElementById('statusResposta').value;

  if (!resposta) { mostrarToast('Digite uma resposta antes de enviar'); return; }

  try {
    const res    = await fetch('/api/admin/responder', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ protocolo: protocoloAtual, resposta, status }),
    });
    const result = await res.json();

    if (result.success) {
      mostrarToast('Resposta enviada com sucesso!');
      fecharModalResposta();
      carregarOcorrencias();
    } else {
      mostrarToast('Erro: ' + result.message);
    }
  } catch {
    mostrarToast('Erro de conexão');
  }
}

function fecharModalResposta() {
  document.getElementById('modalResposta').style.display = 'none';
  protocoloAtual = null;
}

// ── Exportação CSV ────────────────────────────────────────────────────────

function abrirModalExport()  { document.getElementById('modalExport').style.display  = 'flex'; }
function fecharModalExport() { document.getElementById('modalExport').style.display  = 'none'; }

function toggleExportDates() {
  const todas = document.getElementById('exportTodas').checked;
  ['exportDataInicio', 'exportDataFim'].forEach(id =>
    document.getElementById(id).disabled = todas
  );
}

function exportarExcel() {
  const todas  = document.getElementById('exportTodas').checked;
  const inicio = document.getElementById('exportDataInicio').value;
  const fim    = document.getElementById('exportDataFim').value;

  let url = '/api/exportar-csv';
  if (!todas && inicio && fim) url += `?data_inicio=${inicio}&data_fim=${fim}`;

  window.location.href = url;
  fecharModalExport();
}

// ── Utilitários ───────────────────────────────────────────────────────────

async function logout() {
  await fetch('/api/logout');
  window.location.href = '/';
}

function mostrarToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Fecha modais ao clicar fora
document.addEventListener('click', e => {
  ['modalVisualizar', 'modalResposta', 'modalExport'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal && e.target === modal) modal.style.display = 'none';
  });
});
