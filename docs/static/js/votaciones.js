// Página "Votaciones" - hemiciclo interactivo, índice de similitud y
// ausentes. Datos: JSON estático sincronizado desde el repo de scraping
// (webscrapping_congreso), no se genera acá.

const BANCADA_COLOR = {
  FP: 'var(--series-fp)', JP: 'var(--series-jp)', RP: 'var(--series-rp)',
  AN: 'var(--series-an)', OBRAS: 'var(--series-obras)', PBG: 'var(--series-pbg)'
};
const VOTE_COLOR = {
  SI: 'var(--vote-si)', NO: 'var(--vote-no)', ABS: 'var(--vote-abs)', AUSENTE: 'var(--vote-ausente)',
  LICENCIA: 'var(--vote-licencia)', PRESIDENCIA: 'var(--vote-presidencia)', SIN_RESPUESTA: 'var(--vote-sinres)',
  OTRO: 'var(--vote-otro)',
};
const VOTE_LABEL = {
  SI: 'Sí', NO: 'No', ABS: 'Abstención', AUSENTE: 'Ausente',
  LICENCIA: 'Licencia', PRESIDENCIA: 'Presidencia (no vota)', SIN_RESPUESTA: 'Sin respuesta',
  OTRO: 'Otro / código no reconocido', SIN_REGISTRO: 'Sin registro en esta votación',
};

// Cortes de alineamiento con la bancada propia (tienen que coincidir con
// UMBRAL_DISIDENTE en generar_dashboard_json.py y con la nota de la página).
const UMBRAL_ALINEADO = 80;
const UMBRAL_DISIDENTE = 60;
function riesgoClase(pct) {
  if (pct === null || pct === undefined) return '';
  if (pct >= UMBRAL_ALINEADO) return 'riesgo-bajo';
  if (pct >= UMBRAL_DISIDENTE) return 'riesgo-medio';
  return 'riesgo-alto';
}
function riesgoTexto(pct) {
  if (pct === null || pct === undefined) return '-';
  if (pct >= UMBRAL_ALINEADO) return 'Alineado';
  if (pct >= UMBRAL_DISIDENTE) return 'Parcial';
  return 'Disidente';
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.vot-section').forEach(section => revealObserver.observe(section));

fetch(window.VOTACIONES_DATA_URL).then(r => r.json()).then(init).catch(err => {
  document.querySelector('.votaciones-wrap').insertAdjacentHTML('afterbegin', '<p style="color:var(--vote-no)">No se pudo cargar los datos de votaciones: ' + err + '</p>');
});

function init(data) {
  // ===== Quién votó qué (hemiciclo) =====
  const votacionesExcluidas = data.votaciones.filter(v =>
    (v.conteo.SI || 0) + (v.conteo.NO || 0) + (v.conteo.ABS || 0) + (v.conteo.AUSENTE || 0) === 0);
  const votaciones = data.votaciones.filter(v => !votacionesExcluidas.includes(v));

  const BANCADA_NOMBRE = {
    FP: 'Fuerza Popular', JP: 'Juntos por el Perú', RP: 'Renovación Popular',
    AN: 'Ahora Nación', OBRAS: 'Partido Cívico Obras', PBG: 'Partido del Buen Gobierno',
  };

  const votSelect = document.getElementById('votSelect');
  let camaraActual = 'diputados';

  function poblarVotSelect() {
    const opts = [`<option value="banc">Composición de la Cámara</option>`].concat(
      votaciones.map((v, i) => ({ v, i })).filter(({ v }) => v.camara === camaraActual).map(({ v, i }) => {
        const asunto = v.asunto || '(sin asunto registrado)';
        const label = asunto.length > 120 ? asunto.slice(0, 120) + '…' : asunto;
        return `<option value="${i}">${label}${v.fecha ? ' (' + v.fecha + ')' : ''}</option>`;
      })
    );
    votSelect.innerHTML = opts.join('');
    votSelect.value = 'banc';
  }

  const tooltip = document.getElementById('voteTooltip');
  const svg = document.getElementById('votHemi');
  const DOT_R = 7.2;
  let hemiCamara = null;

  function setViewBox(camara) {
    const maxR = data.votaciones.find(v => v.camara === camara).maxRadio;
    const pad = 26;
    svg.setAttribute('viewBox', `${-maxR - pad} ${-maxR - pad} ${maxR * 2 + pad * 2} ${maxR + pad * 2}`);
  }

  function setCaveat(html) {
    const el = document.getElementById('votOtroCaveat');
    el.innerHTML = html;
    el.style.display = html ? '' : 'none';
  }

  function attachTooltip(seat) {
    seat.addEventListener('mouseenter', () => {
      const votoLine = seat.dataset.voto ? `${seat.dataset.bancada} &middot; ${seat.dataset.voto}${seat.dataset.codigo ? ' <span style="opacity:.6">(' + seat.dataset.codigo + ')</span>' : ''}` : seat.dataset.bancada;
      tooltip.innerHTML = `<b>${seat.dataset.nombre}</b>${votoLine}`;
      tooltip.style.borderLeftColor = BANCADA_COLOR[seat.dataset.bancadaCode] || 'transparent';
      tooltip.style.opacity = '1';
    });
    seat.addEventListener('mousemove', (e) => { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; });
    seat.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
  }

  function buildSeats(camara, seatDataList, rebuildIfNeeded) {
    if (camara !== hemiCamara || rebuildIfNeeded) {
      setViewBox(camara);
      svg.innerHTML = seatDataList.map((a, i) => {
        const stroke = a.hollow ? '' : `stroke="var(--blanco)" stroke-width="1.4"`;
        return `<circle class="${a.cls} seat-enter" style="animation-delay:${(i*2.6).toFixed(1)}ms" cx="${a.x}" cy="${a.y}" r="${DOT_R}" fill="${a.fill}" ${stroke}
          data-nombre="${a.nombre}" data-bancada="${a.bancada}" data-bancada-code="${a.bancadaCode}" data-voto="${a.voto || ''}" data-codigo="${a.codigo || ''}"></circle>`;
      }).join('');
      svg.querySelectorAll('.seat, .seat.sin-registro').forEach(attachTooltip);
      hemiCamara = camara;
    } else {
      // Reusar los círculos existentes en vez de reconstruir el SVG (más
      // fluido al cambiar de votación), pero el orden de seatDataList
      // (viene del PDF de cada votación) no coincide con el orden usado
      // para crear los círculos la primera vez -- así que hay que
      // reposicionar cx/cy explícitamente por curul, no solo recolorear
      // por índice, o el voto de una persona termina mostrado en el
      // curul físico de otra.
      const circles = svg.querySelectorAll('circle');
      seatDataList.forEach((a, i) => {
        const c = circles[i];
        c.setAttribute('class', a.cls); c.setAttribute('fill', a.fill);
        c.setAttribute('cx', a.x); c.setAttribute('cy', a.y);
        c.dataset.nombre = a.nombre; c.dataset.bancada = a.bancada; c.dataset.bancadaCode = a.bancadaCode; c.dataset.voto = a.voto || ''; c.dataset.codigo = a.codigo || '';
      });
    }
  }

  function renderPorBancada(camara) {
    document.getElementById('votMeta').textContent =
      `${camara === 'diputados' ? 'Cámara de Diputados' : 'Senado'} · coloreado por bancada`;
    document.getElementById('votAsuntoFull').textContent = '';
    const roster = data.rosterBancada[camara];
    const conteo = {};
    roster.forEach(s => { conteo[s.bancada] = (conteo[s.bancada] || 0) + 1; });
    const legendDiv = document.getElementById('votLegendRow');
    legendDiv.className = 'bancada-legend';
    legendDiv.innerHTML = Object.keys(BANCADA_NOMBRE).filter(b => conteo[b]).sort((a, b) => conteo[b] - conteo[a]).map(b => `
        <div class="item">
          <span class="dot" style="background:${BANCADA_COLOR[b]}"></span>
          <div><span class="num">${conteo[b]}</span><div class="name">${BANCADA_NOMBRE[b]}</div></div>
        </div>
      `).join('');

    const seatData = roster.map(s => ({
      x: s.x, y: s.y, cls: 'seat', fill: BANCADA_COLOR[s.bancada], hollow: false,
      nombre: s.congresista, bancada: BANCADA_NOMBRE[s.bancada] || s.bancada, bancadaCode: s.bancada,
    }));
    buildSeats(camara, seatData, true);
    setCaveat('');
  }

  function renderVotacion(idx) {
    const v = votaciones[idx];
    document.getElementById('votMeta').textContent =
      `${v.totalAsientos} curules · ${v.camara === 'diputados' ? 'Cámara de Diputados' : 'Senado'}${v.fecha ? ' · ' + v.fecha : ''}`;
    document.getElementById('votAsuntoFull').textContent = v.asunto || '';
    const legendKeysBase = ['SI', 'NO', 'ABS', 'AUSENTE'];
    const legendKeysExtra = ['LICENCIA', 'PRESIDENCIA', 'SIN_RESPUESTA', 'OTRO'].filter(k => (v.conteo[k] || 0) > 0);
    const legendKeys = legendKeysBase.concat(legendKeysExtra);
    const legendDiv = document.getElementById('votLegendRow');
    legendDiv.className = 'legend-row';
    legendDiv.innerHTML = legendKeys.map(k => `
      <div class="legend-item"><span class="legend-dot" style="background:${VOTE_COLOR[k]}"></span>${VOTE_LABEL[k]} <span class="n">${v.conteo[k] || 0}</span></div>
    `).join('') + `<div class="legend-item"><span class="legend-dot hollow"></span>Sin registro <span class="n">${v.conteo.SIN_REGISTRO || 0}</span></div>`;

    const seatData = v.votos.map(x => {
      const isEmpty = x.voto === 'SIN_REGISTRO';
      return { x: x.x, y: x.y, cls: isEmpty ? 'seat sin-registro' : 'seat', fill: isEmpty ? 'none' : VOTE_COLOR[x.voto], hollow: isEmpty,
        nombre: x.congresista, bancada: BANCADA_NOMBRE[x.bancada] || x.bancada, bancadaCode: x.bancada, voto: VOTE_LABEL[x.voto], codigo: x.codigoOriginal };
    });
    buildSeats(v.camara, seatData, false);

    const nOtro = v.conteo.OTRO || 0;
    setCaveat(nOtro > 0
      ? `<b>${nOtro} registro(s) en "Otro":</b> código de voto no reconocido por el pipeline -- vale la pena revisar el PDF fuente de esta sesión.`
      : '');
  }

  document.querySelectorAll('#votCamaraToggle .filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      camaraActual = btn.dataset.camara;
      document.querySelectorAll('#votCamaraToggle .filtro-btn').forEach(b => b.classList.toggle('active', b === btn));
      poblarVotSelect();
      renderPorBancada(camaraActual);
    });
  });

  votSelect.addEventListener('change', () => {
    const val = votSelect.value;
    if (val === 'banc') renderPorBancada(camaraActual);
    else renderVotacion(+val);
  });

  poblarVotSelect();
  renderPorBancada(camaraActual);

  // ===== Ausentes =====
  function camaraTag(camara) { return camara === 'diputados' ? 'D' : 'S'; }

  // Ausencias en bruto + filtros: rango de fechas (calendario nativo) y
  // modo de conteo. "Por día" cuenta cada fecha de sesión una sola vez
  // aunque tenga varios pases de lista (una sesión larga puede tener 18);
  // "por pase de lista" cuenta cada página de asistencia por separado.
  const TOP_N = 10;  // sin búsqueda, solo los 10 más desalineados / con más ausencias
  const A = data.asistencia;
  const fechasSesion = A.sesiones.map(s => s.fecha).sort();
  const fMin = fechasSesion[0], fMax = fechasSesion[fechasSesion.length - 1];
  const inpDesde = document.getElementById('votAusDesde');
  const inpHasta = document.getElementById('votAusHasta');
  const inpBuscar = document.getElementById('votAusBuscar');
  inpDesde.min = inpHasta.min = fMin;
  inpDesde.max = inpHasta.max = fMax;
  inpDesde.value = fMin;
  inpHasta.value = fMax;
  let modoAus = 'dia';

  document.getElementById('votAusentesNote').textContent =
    'Filtra por rango de fechas y elige cómo contar: por día de sesión (un día con varios pases de lista cuenta una sola vez) o por cada pase de lista (cada vez que se toma asistencia).';

  function renderAusentes() {
    const desde = inpDesde.value || fMin, hasta = inpHasta.value || fMax;
    const enRango = A.sesiones.map(s => s.fecha >= desde && s.fecha <= hasta);

    // Denominador por cámara: días distintos o pases de lista en el rango.
    const total = { diputados: new Set(), senado: new Set() };
    A.sesiones.forEach((s, i) => {
      if (enRango[i]) total[s.camara].add(modoAus === 'dia' ? s.fecha : i);
    });

    const conteo = A.congresistas.map(() => new Set());
    A.ausencias.forEach(([c, i]) => {
      if (enRango[i]) conteo[c].add(modoAus === 'dia' ? A.sesiones[i].fecha : i);
    });
    const todas = A.congresistas
      .map((c, k) => ({ ...c, n: conteo[k].size, de: total[c.camara].size }))
      .filter(r => r.n > 0)
      .sort((a, b) => b.n - a.n || a.congresista.localeCompare(b.congresista));
    const flt = inpBuscar.value.trim().toLowerCase();
    const coincidencias = flt ? todas.filter(r => r.congresista.toLowerCase().includes(flt)) : todas;
    const filas = flt ? coincidencias : coincidencias.slice(0, TOP_N);

    const unidad = modoAus === 'dia' ? 'día(s) de sesión' : 'pase(s) de lista';
    document.getElementById('votAusentesResumen').textContent =
      `${desde} a ${hasta}: ${total.diputados.size} ${unidad} en Diputados, ${total.senado.size} en Senado. ` +
      `${todas.length} ${todas.length === 1 ? 'individuo' : 'individuos'} con al menos una ausencia. ` +
      (flt ? `${coincidencias.length} resultado(s) para "${inpBuscar.value.trim()}".`
           : `Mostrando los ${filas.length} con más ausencias; busca por nombre para ver al resto.`);

    const maxN = Math.max(1, ...filas.map(r => r.n));
    document.getElementById('votAusentesBars').innerHTML = filas.length ? filas.map(a => `
      <div class="bar-row">
        <div class="bname"><span class="bar-swatch" style="background:${BANCADA_COLOR[a.bancada]}"></span><span class="camara-tag" title="${a.camara === 'diputados' ? 'Diputado/a' : 'Senador/a'}">${camaraTag(a.camara)}</span>${a.congresista} (${a.bancada})</div>
        <div class="btrack"><div class="bfill" style="width:${a.n / maxN * 100}%"></div></div>
        <div class="bval" title="de ${a.de} ${unidad} de su cámara en el rango">${a.n}<span class="bval-de"> / ${a.de}</span></div>
      </div>
    `).join('') : '<div class="panel-note">Sin ausencias registradas en este rango.</div>';
  }

  document.querySelectorAll('#votAusModo .filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#votAusModo .filtro-btn').forEach(b => b.classList.toggle('active', b === btn));
      modoAus = btn.dataset.modo;
      renderAusentes();
    });
  });
  [inpDesde, inpHasta].forEach(i => i.addEventListener('change', () => {
    // Si el rango queda invertido, se corrige moviendo el otro extremo.
    if (inpDesde.value && inpHasta.value && inpDesde.value > inpHasta.value) {
      if (i === inpDesde) inpHasta.value = inpDesde.value; else inpDesde.value = inpHasta.value;
    }
    renderAusentes();
  }));
  inpBuscar.value = '';
  inpBuscar.addEventListener('input', renderAusentes);
  document.getElementById('votAusReset').addEventListener('click', () => {
    inpDesde.value = fMin; inpHasta.value = fMax; renderAusentes();
  });
  renderAusentes();

  // ===== Índice de similitud =====
  function seqColor(v) {
    if (v === null || v === undefined) return 'var(--gris-bg)';
    if (v >= 90) return 'var(--seq-700)'; if (v >= 75) return 'var(--seq-500)'; if (v >= 60) return 'var(--seq-300)';
    return 'var(--seq-100)';
  }
  function textOn(v) { return (v !== null && v >= 75) ? '#fff' : 'var(--texto)'; }

  const nDisidentes = data.individual.filter(r => r.esDisidente).length;
  // Total del roster (190), no solo quienes tienen votos reales (188) --
  // los 2 que faltan son los presidentes de cada cámara (nunca votan, no
  // es un error de mapeo). Mostrar 188 ahí confundía, como si faltara
  // gente por mapear.
  const nCongresistas = Object.values(data.rosterBancada).reduce((n, roster) => n + roster.length, 0);
  const FUENTE = {
    bancadas: data.bancadasConVotosReales, matriz: data.matrizBancadas, individual: data.individual,
    colorOf: b => BANCADA_COLOR[b] || 'var(--texto-muted)', nombreOf: b => b,
    stats: [
      { v: String(data.nVotacionesReales), l: 'votaciones reales' },
      { v: String(nCongresistas), l: 'diputados/senadores' },
      { v: String(nDisidentes), l: nDisidentes === 1 ? 'disidente' : 'disidentes' },
    ],
    matrixNote: 'Para cada par de bancadas, se compara su posición mayoritaria (a favor, en contra o abstención) en cada votación real; el % indica en cuántas de esas votaciones coincidieron entre sí.',
  };

  document.getElementById('votStatRow').innerHTML = FUENTE.stats.map(s => `<div class="stat-box"><span class="stat-num">${s.v}</span><span class="stat-label">${s.l}</span></div>`).join('');
  document.getElementById('votMatrixNote').textContent = FUENTE.matrixNote;

  const bancadas = FUENTE.bancadas;
  let matrixHtml = '<thead><tr><th></th>' + bancadas.map(b => `<th style="color:${BANCADA_COLOR[b]}" title="${BANCADA_NOMBRE[b] || FUENTE.nombreOf(b)}">${b}</th>`).join('') + '</tr></thead><tbody>';
  bancadas.forEach(b1 => {
    matrixHtml += `<tr><th class="rowhead" style="color:${BANCADA_COLOR[b1]}" title="${BANCADA_NOMBRE[b1] || FUENTE.nombreOf(b1)}">${b1}</th>`;
    bancadas.forEach(b2 => {
      if (b1 === b2) {
        matrixHtml += `<td class="diag"></td>`;
      } else {
        const v = FUENTE.matriz[b1] ? FUENTE.matriz[b1][b2] : null;
        const votos = v === null ? '' : Math.round(v / 100 * data.nVotacionesReales);
        matrixHtml += `<td style="background:${seqColor(v)};color:${textOn(v)}" data-b1="${b1}" data-b2="${b2}" data-pct="${v ?? ''}" data-votos="${votos}">${v ?? '-'}</td>`;
      }
    });
    matrixHtml += '</tr>';
  });
  document.getElementById('votBancadaMatrix').innerHTML = matrixHtml + '</tbody>';

  document.querySelectorAll('#votBancadaMatrix td[data-b1]').forEach(td => {
    td.addEventListener('mouseenter', () => {
      const b1 = td.dataset.b1, b2 = td.dataset.b2, pct = td.dataset.pct, votos = td.dataset.votos;
      if (pct === '') return;
      tooltip.innerHTML = `<b>${BANCADA_NOMBRE[b1] || b1} &middot; ${BANCADA_NOMBRE[b2] || b2}</b>${pct}% de acuerdo - ${votos} de ${data.nVotacionesReales} votaciones reales`;
      tooltip.style.borderLeftColor = 'var(--rosa)';
      tooltip.style.opacity = '1';
    });
    td.addEventListener('mousemove', (e) => { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; });
    td.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
  });

  const sorted = FUENTE.individual.slice().sort((a, b) => (a.matchPropia ?? 999) - (b.matchPropia ?? 999));
  function renderIndiv(filter) {
    const flt = (filter || '').toLowerCase();
    const coincidencias = sorted.filter(r => !flt || r.congresista.toLowerCase().includes(flt));
    const rows = flt ? coincidencias : coincidencias.slice(0, TOP_N);
    document.getElementById('votIndivResumen').textContent = flt
      ? `${coincidencias.length} resultado(s) para "${filter}".`
      : `Mostrando los ${rows.length} más desalineados de ${sorted.length}. Busca por nombre para ver al resto.`;
    document.getElementById('votIndivBody').innerHTML = rows.map((r, i) => `
      <tr data-idx="${sorted.indexOf(r)}">
        <td><span class="camara-tag" title="${r.camara === 'diputados' ? 'Diputado/a' : 'Senador/a'}">${camaraTag(r.camara)}</span>${r.congresista}</td>
        <td><span class="swatch-sm" style="background:${FUENTE.colorOf(r.bancada)}"></span>${r.bancada}</td>
        <td class="num">${r.matchPropia ?? '-'}%</td>
        <td><span class="riesgo-badge ${riesgoClase(r.matchPropia)}">${riesgoTexto(r.matchPropia)}</span></td>
      </tr>
    `).join('');

    document.querySelectorAll('#votIndivBody tr').forEach(tr => {
      const r = sorted[+tr.dataset.idx];
      tr.addEventListener('mouseenter', () => {
        const mejores = (r.mejoresBancadas || []).map(b => BANCADA_NOMBRE[b] || b).join(', ');
        tooltip.innerHTML = `<b>${r.congresista}</b>Se parece más a: ${mejores} (${r.mejorMatch}%)`;
        tooltip.style.borderLeftColor = FUENTE.colorOf(r.bancada);
        tooltip.style.opacity = '1';
      });
      tr.addEventListener('mousemove', (e) => { tooltip.style.left = e.clientX + 'px'; tooltip.style.top = e.clientY + 'px'; });
      tr.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
    });
  }
  const searchBox = document.getElementById('votIndivSearch');
  searchBox.value = ''; searchBox.oninput = (e) => renderIndiv(e.target.value);
  renderIndiv('');
}
