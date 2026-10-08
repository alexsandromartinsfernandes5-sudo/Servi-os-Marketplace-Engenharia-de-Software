function abrirAba(idAba, elementoClicado) {
    const todasAbas = document.querySelectorAll('.conteudo-aba');
    todasAbas.forEach(aba => { aba.style.display = 'none'; });
  
    const todosLinks = document.querySelectorAll('header nav a');
    todosLinks.forEach(link => { link.classList.remove('ativo'); });
  
    document.getElementById(idAba).style.display = 'block';
  
    if (elementoClicado) { elementoClicado.classList.add('ativo'); }
  
    if (idAba === 'aba-pedido') {
      setTimeout(() => { mapInstance.invalidateSize(); }, 10);
    }
  }
  
  let centerLat = -23.4628;
  let centerLng = -46.5333;
  
  const mapInstance = L.map('map').setView([centerLat, centerLng], 13);
  
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Dados geoespaciais &copy; Esri'
  }).addTo(mapInstance);
  
  const layerMarkers = L.layerGroup().addTo(mapInstance);
  
  const P = [
    { id: 1, n: 'Carlos Mendes', s: 'Limpeza residencial', c: 'Limpeza', p: 150, r: 4.8, x: 1.2, y: -0.8, a: true },
    { id: 2, n: 'Marta Souza', s: 'Faxina pesada', c: 'Limpeza', p: 220, r: 4.5, x: -3.5, y: 2.1, a: true },
    { id: 3, n: 'João Volts', s: 'Reparo elétrico', c: 'Elétrica', p: 180, r: 4.9, x: 4.2, y: 3.0, a: true },
    { id: 4, n: 'Rafa Instalações', s: 'Troca de chuveiro', c: 'Elétrica', p: 120, r: 4.2, x: -1.0, y: -1.5, a: true },
    { id: 5, n: 'Beto Hidráulica', s: 'Conserto vazamentos', c: 'Encanamento', p: 200, r: 4.7, x: 2.8, y: -4.4, a: true },
    { id: 6, n: 'Lia Cores', s: 'Pintura de paredes', c: 'Pintura', p: 350, r: 4.6, x: -6.0, y: -2.0, a: true },
    { id: 7, n: 'Dona Flor', s: 'Jardinagem e poda', c: 'Jardinagem', p: 130, r: 5.0, x: 8.5, y: 5.0, a: true },
    { id: 8, n: 'Téo Suporte', s: 'Suporte informático', c: 'Tecnologia', p: 160, r: 4.4, x: 0.6, y: 2.4, a: false },
    { id: 9, n: 'Nina Montagens', s: 'Montagem de móveis', c: 'Montagem', p: 140, r: 4.3, x: -4.8, y: -3.6, a: true }
  ];
  
  P.forEach(p => {
    p.lat = centerLat + (p.y * -0.009);
    p.lng = centerLng + (p.x * 0.009);
  });
  
  const $ = s => document.querySelector(s);
  const brl = v => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  const dist = p => mapInstance.distance([centerLat, centerLng], [p.lat, p.lng]) / 1000;
  const score = p => 1000 * (1 - Math.min(dist(p) / 10, 1)) + p.r * 100 + (p.a ? 200 : 0);
  const STEPS = ['Requisitado', 'Localizado', 'Confirmado', 'Em Trânsito', 'Em Execução', 'Finalizado'];
  let cat = 'Todos', radius = 8, busy = false, order = null, timer = null;
  
  function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $('#toasts').append(d); setTimeout(() => d.remove(), 4500);
  }
  
  function visible() { return P.filter(p => dist(p) <= radius && (cat === 'Todos' || p.c === cat)); }
  
  function renderChips() {
    const cats = ['Todos', ...new Set(P.map(p => p.c))];
    $('#chips').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
  }
  
  function renderList() {
    const v = visible().sort((a, b) => dist(a) - dist(b));
    $('#count').textContent = '(' + v.length + ')';
    $('#list').innerHTML = v.length ? v.map(p => `
     <div class="svc ${order && order.best.id === p.id ? 'best' : ''}">
       <div class="top"><span>${p.s}</span><span class="price">${brl(p.p)}</span></div>
       <div class="meta"><span>${p.n}</span><span>Avaliação: ${p.r.toFixed(1)}</span><span>${dist(p).toFixed(1)} km</span>
         <span class="tag ${p.a ? '' : 'off'}">${p.a ? 'Disponível' : 'Indisponível'}</span></div>
       <div><button class="btn" data-req="${p.id}" ${(!p.a || busy) ? 'disabled' : ''}>Requisitar</button></div>
     </div>`).join('') : '<p>Nenhum prestador de serviços homologado neste raio de abrangência.</p>';
  }
  
  function renderMap(posAtual) {
    layerMarkers.clearLayers();
    L.circle([centerLat, centerLng], { radius: radius * 1000, color: '#1f6f8b', fillOpacity: 0.07, weight: 2 }).addTo(layerMarkers);
  
    L.circleMarker([centerLat, centerLng], { radius: 9, color: '#fff', fillColor: '#1f6f8b', fillOpacity: 1, weight: 3 }).bindTooltip("Localização", { permanent: true, direction: 'right', className: 'map-label' }).addTo(layerMarkers);
  
    visible().forEach(p => {
      const isBest = order && order.best.id === p.id;
      if (isBest && posAtual) return;
      let color = isBest ? '#ffc233' : p.a ? '#1a8f5a' : '#9aa7b1';
      L.circleMarker([p.lat, p.lng], { radius: isBest ? 10 : 7, color: '#10243e', fillColor: color, fillOpacity: 1, weight: isBest ? 3 : 1.5 }).bindTooltip(p.n.split(' ')[0], { permanent: true, direction: 'right', className: 'map-label' }).addTo(layerMarkers);
    });
  
    if (order && posAtual) {
      L.polyline([[posAtual.lat, posAtual.lng], [centerLat, centerLng]], { color: '#ffc233', dashArray: '6, 6', weight: 3 }).addTo(layerMarkers);
      L.circleMarker([posAtual.lat, posAtual.lng], { radius: 11, color: '#10243e', fillColor: '#ffc233', fillOpacity: 1, weight: 3 }).bindTooltip(order.best.n.split(' ')[0], { permanent: true, direction: 'right', className: 'map-label' }).addTo(layerMarkers);
    }
  }
  
  function renderSteps(i) { $('#steps').innerHTML = STEPS.map((t, k) => `<span class="step ${k < i ? 'done' : k === i ? 'now' : ''}">${t}</span>`).join('') }
  
  function request(id) {
    const sel = P.find(p => p.id === id);
    const cands = P.filter(p => p.c === sel.c && p.a && dist(p) <= radius).map(p => ({ p, score: score(p) })).sort((a, b) => b.score - a.score);
    if (!cands.length) { toast('Prestador indisponível no momento.'); return }
    busy = true;
    const best = cands[0].p;
    order = { best, pos: { lat: best.lat, lng: best.lng }, gps: 0 };
    best.a = false;
    $('#painel-lista').hidden = true; $('#pedidoBox').hidden = false; $('#pay').hidden = true; $('#novo').hidden = true; $('#gps').textContent = 0;
    $('#rank').innerHTML = '<tr><th>Profissional</th><th>Distância</th><th>Classificação</th><th>Índice</th></tr>' + cands.map((c, i) => `<tr class="${i ? '' : 'win'}"><td>${c.p.n}</td><td>${dist(c.p).toFixed(1)} km</td><td>${c.p.r.toFixed(1)}</td><td>${Math.round(c.score)}</td></tr>`).join('');
    renderSteps(0); renderAll();
    info('Processando busca para o serviço de <b>' + sel.s + '</b>…');
    setTimeout(() => { renderSteps(1); info('Atribuição: <b>' + best.n + '</b> a ' + dist(best).toFixed(1) + ' km (Classificação ' + best.r.toFixed(1) + ').'); toast('A notificar as partes envolvidas.') }, 900);
    setTimeout(() => { renderSteps(2); toast(best.n + ' confirmou o atendimento.') }, 2200);
    setTimeout(() => { renderSteps(3); toast(best.n + ' iniciou o deslocamento.'); drive(best) }, 3300);
  }
  
  function info(h) { $('#info').innerHTML = '<p>' + h + '</p>' }
  
  function drive(best) {
    const n = 6; let k = 0;
    const tick = () => {
      k++; order.gps++; $('#gps').textContent = order.gps;
      const f = k / n;
      order.pos = { lat: best.lat * (1 - f) + centerLat * f, lng: best.lng * (1 - f) + centerLng * f };
      const left = mapInstance.distance([order.pos.lat, order.pos.lng], [centerLat, centerLng]) / 1000;
      info(left > 0.05 ? 'O profissional encontra-se a <b>' + left.toFixed(1) + ' km</b> de distância · Estimativa: ' + Math.max(1, Math.round(left * 3)) + ' minutos.' : 'O profissional chegou ao destino.');
      renderMap(order.pos);
      if (k < n) { timer = setTimeout(tick, $('#bat').checked ? 2500 : 1000) } else arrive();
    };
    timer = setTimeout(tick, 1000);
  }
  
  function arrive() {
    toast('O profissional chegou ao local do serviço.'); renderSteps(4);
    setTimeout(() => { renderSteps(5); info('Ordem de serviço concluída. Prossiga com o encerramento financeiro.'); toast('Serviço finalizado.'); $('#pay').hidden = false; $('#novo').hidden = false }, 2500);
  }
  
  function renderAll() { renderList(); renderMap(order && order.pos) }
  
  $('#chips').onclick = e => { const c = e.target.dataset.c; if (!c) return; cat = c; renderChips(); renderAll() };
  $('#raio').oninput = e => { radius = +e.target.value; $('#raioV').textContent = radius + ' km'; mapInstance.setZoom(radius > 8 ? 12 : (radius < 4 ? 14 : 13)); renderAll() };
  $('#list').onclick = e => { const id = e.target.dataset.req; if (id && !busy) request(+id) };
  $('#pay').onclick = () => { $('#pay').hidden = true; toast('Transação processada.'); info('Obrigado. O pagamento foi registado no sistema.') };
  
  $('#novo').onclick = () => {
    clearTimeout(timer); P.forEach(p => p.a = p.id !== 8); busy = false; order = null;
    $('#pedidoBox').hidden = true; $('#painel-lista').hidden = false; renderAll();
  };
  
  $('#btnLoc').onclick = () => {
    if (!navigator.geolocation) { toast('O navegador atual não suporta serviços de geolocalização.'); return; }
    $('#locInfo').textContent = 'Estabelecendo conexão com satélites...';
    navigator.geolocation.getCurrentPosition(
      (g) => {
        centerLat = g.coords.latitude; centerLng = g.coords.longitude;
        mapInstance.setView([centerLat, centerLng], 14);
        P.forEach(p => { p.lat = centerLat + (p.y * -0.009); p.lng = centerLng + (p.x * 0.009); });
        renderAll(); $('#locInfo').textContent = 'Coordenadas obtidas com margem de erro de ±' + Math.round(g.coords.accuracy) + ' metros.'; toast('Posicionamento estabelecido.');
      },
      (erro) => {
        let motivo = erro.code === erro.PERMISSION_DENIED ? "Acesso restrito pelo utilizador." : "Comunicação falhou (Timeout/Rede).";
        $('#locInfo').textContent = 'Erro: ' + motivo; toast('Operação cancelada: ' + motivo);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  };
  
  function irParaCategoria(categoriaSelecionada) {
    cat = categoriaSelecionada;
    renderChips();
    renderAll();
    const linksNav = document.querySelectorAll('.menu-principal a');
    abrirAba('aba-pedido', linksNav[1]);
  }
  
  function renderDestaques() {
    const top3 = [...P].sort((a, b) => b.r - a.r).slice(0, 3);
    document.getElementById('destaques-home').innerHTML = top3.map((p, index) => `
          <div class="card-home" style="cursor: default; animation-delay: ${index * 0.1}s;">
              <div class="card-texto" style="text-align: center;">
                  <div style="font-size: 0.85rem; font-weight: 800; color: var(--sun); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">Destaque</div>
                  <h3 style="color: var(--ink); margin-bottom: 4px;">${p.n}</h3>
                  <p style="color: var(--sea); font-weight: bold; margin-bottom: 8px;">${p.c}</p>
                  <p style="font-size: 0.9rem; color: #4b6073;">Índice de Qualidade: <b style="color: var(--ink);">${p.r.toFixed(1)}</b> / 5.0</p>
              </div>
          </div>
      `).join('');
  }
  
  renderChips();
  renderAll();
  renderDestaques();