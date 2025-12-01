// predictions.js
// Cálculo y renderizado de pronósticos y mercados de apuestas.

import { API_URL } from './api.js';
import { setPronosticosGlobales, pronosticosGlobales } from './state.js';

/** Obtiene ligas y genera pronósticos con el pronosticador global */
export async function generarPronosticos() {
  const container = document.getElementById('pronosticos-container');
  try {
    container.innerHTML = `<div id="pronosticos-loading" style="text-align: center; color: #666; padding: 20px;">\n      <p>🔮 Analizando estadísticas y generando pronósticos...</p>\n    </div>`;

    const response = await fetch(`${API_URL}/ligas`);
    const todasLasLigas = await response.json();

    const ligasCompletas = [];
    for (const liga of todasLasLigas) {
      const detalleResponse = await fetch(`${API_URL}/ligas/${liga.id}`);
      const ligaDetalle = await detalleResponse.json();
      ligasCompletas.push(ligaDetalle);
    }

    const pronosticos = window.pronosticador.generarPronosticosGlobales(ligasCompletas);
    setPronosticosGlobales(pronosticos);
    mostrarPronosticos(pronosticos);
  } catch (error) {
    console.error('Error al generar pronósticos:', error);
    container.innerHTML = `<div class="sin-pronosticos">\n      <h4>❌ Error al generar pronósticos</h4>\n      <p>No se pudieron cargar los datos necesarios. Intenta nuevamente.</p>\n    </div>`;
  }
}

/** Renderiza la lista de pronósticos por liga */
export function mostrarPronosticos(pronosticos) {
  const container = document.getElementById('pronosticos-container');
  if (!Array.isArray(pronosticos) || pronosticos.length === 0) {
    container.innerHTML = `<div class="sin-pronosticos">\n      <h4>📅 No hay partidos pendientes</h4>\n      <p>No se encontraron partidos pendientes para generar pronósticos.<br>Agrega algunos partidos en el tab "Partidos" para ver pronósticos aquí.</p>\n    </div>`;
    return;
  }
  container.innerHTML = pronosticos.map(ligaPronostico => `
    <div class="pronosticos-liga">
      <h4>🏆 ${ligaPronostico.liga}</h4>
      ${ligaPronostico.partidos.map(p => generarHTMLPronostico(p)).join('')}
    </div>`).join('');
}

/** Card con resumen del pronóstico */
export function generarHTMLPronostico(pronostico) {
  const local = pronostico.equipoLocal;
  const visitante = pronostico.equipoVisitante;
  const prob = pronostico.probabilidades;

  let ganadorClass = '';
  if (prob.local > prob.empate && prob.local > prob.visitante) ganadorClass = 'local-favorito';
  else if (prob.visitante > prob.empate && prob.visitante > prob.local) ganadorClass = 'visitante-favorito';

  const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E`;
  const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EV%3C/text%3E%3C/svg%3E`;

  return `
    <div class="pronostico-partido ${ganadorClass}" onclick="verDetallePronostico('${pronostico.ligaNombre}', ${pronostico.partidoId})">
      <div class="pronostico-header">
        <div class="pronostico-equipos">
          <div class="pronostico-equipo">
            <img class="pronostico-equipo-logo" src="${fotoLocal}" alt="${local.nombre}">
            <span class="pronostico-equipo-nombre">${local.nombre}</span>
          </div>
          <span class="vs-pronostico">VS</span>
          <div class="pronostico-equipo">
            <img class="pronostico-equipo-logo" src="${fotoVisitante}" alt="${visitante.nombre}">
            <span class="pronostico-equipo-nombre">${visitante.nombre}</span>
          </div>
        </div>
        <div class="pronostico-jornada">Jornada ${pronostico.jornada}</div>
      </div>
      <div class="probabilidades-container">
        <div class="probabilidad-item ${prob.local > prob.empate && prob.local > prob.visitante ? 'ganador' : ''}"><h5>${local.nombre}</h5><div class="probabilidad-porcentaje">${prob.local}%</div></div>
        <div class="probabilidad-item ${prob.empate > prob.local && prob.empate > prob.visitante ? 'ganador' : ''}"><h5>Empate</h5><div class="probabilidad-porcentaje">${prob.empate}%</div></div>
        <div class="probabilidad-item ${prob.visitante > prob.empate && prob.visitante > prob.local ? 'ganador' : ''}"><h5>${visitante.nombre}</h5><div class="probabilidad-porcentaje">${prob.visitante}%</div></div>
      </div>
      <div class="pronostico-resumen">
        <div class="goles-esperados">
          <span>${local.estadisticas.golesEsperados} - ${visitante.estadisticas.golesEsperados}</span>
          <small>Goles esperados</small>
        </div>
        <div class="click-hint">👆 Haz clic para ver análisis completo</div>
      </div>
    </div>`;
}

/** Encuentra un pronóstico por liga/partido y muestra la vista detallada */
export function verDetallePronostico(ligaNombre, partidoId) {
  let pronosticoDetallado = null;
  for (const ligaPronostico of pronosticosGlobales) {
    if (ligaPronostico.liga === ligaNombre) {
      pronosticoDetallado = ligaPronostico.partidos.find(p => p.partidoId === partidoId);
      if (pronosticoDetallado) break;
    }
  }
  if (!pronosticoDetallado) { alert('No se pudo cargar el detalle del pronóstico'); return; }
  const titulo = document.getElementById('detalle-pronostico-titulo');
  titulo.textContent = `🔮 Pronóstico Detallado: ${pronosticoDetallado.equipoLocal.nombre} vs ${pronosticoDetallado.equipoVisitante.nombre}`;
  const contenido = document.getElementById('detalle-pronostico-contenido');
  contenido.innerHTML = generarHTMLPronosticoDetallado(pronosticoDetallado);
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  document.getElementById('vista-detalle-pronostico').classList.add('activa');
}

/** Construye el detalle del pronóstico, incluyendo mercados */
export function generarHTMLPronosticoDetallado(pronostico) {
  const local = pronostico.equipoLocal;
  const visitante = pronostico.equipoVisitante;
  const prob = pronostico.probabilidades;
  const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E`;
  const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EV%3C/text%3E%3C/svg%3E`;
  return `
    <div class="pronostico-detallado">
      <div class="pronostico-header-detallado">
        <div class="equipos-enfrentamiento">
          <div class="equipo-detallado"><img src="${fotoLocal}" alt="${local.nombre}" class="equipo-detallado-logo"><h3>${local.nombre}</h3><span class="condicion-juego">Local</span></div>
          <div class="vs-detallado">VS</div>
          <div class="equipo-detallado"><img src="${fotoVisitante}" alt="${visitante.nombre}" class="equipo-detallado-logo"><h3>${visitante.nombre}</h3><span class="condicion-juego">Visitante</span></div>
        </div>
        <div class="jornada-info"><span class="jornada-badge-detallado">Jornada ${pronostico.jornada}</span></div>
      </div>
      <div class="resultado-esperado"><h4>🎯 Resultado Esperado</h4><div class="marcador-esperado"><span class="gol-local">${local.estadisticas.golesEsperados}</span><span class="separador">-</span><span class="gol-visitante">${visitante.estadisticas.golesEsperados}</span></div></div>
      <div class="probabilidades-detalladas"><h4>📊 Probabilidades de Resultado</h4><div class="probabilidades-grid">
        <div class="probabilidad-detallada ${prob.local > prob.empate && prob.local > prob.visitante ? 'mas-probable' : ''}"><div class="probabilidad-equipo"><img src="${fotoLocal}" alt="${local.nombre}"><span>${local.nombre}</span></div><div class="probabilidad-numero">${prob.local}%</div><div class="probabilidad-barra"><div class="barra-fill" style="width: ${prob.local}%"></div></div></div>
        <div class="probabilidad-detallada ${prob.empate > prob.local && prob.empate > prob.visitante ? 'mas-probable' : ''}"><div class="probabilidad-equipo"><span>⚖️ Empate</span></div><div class="probabilidad-numero">${prob.empate}%</div><div class="probabilidad-barra"><div class="barra-fill" style="width: ${prob.empate}%"></div></div></div>
        <div class="probabilidad-detallada ${prob.visitante > prob.empate && prob.visitante > prob.local ? 'mas-probable' : ''}"><div class="probabilidad-equipo"><img src="${fotoVisitante}" alt="${visitante.nombre}"><span>${visitante.nombre}</span></div><div class="probabilidad-numero">${prob.visitante}%</div><div class="probabilidad-barra"><div class="barra-fill" style="width: ${prob.visitante}%"></div></div></div>
      </div></div>
      <div class="estadisticas-comparativas"><h4>📈 Análisis Estadístico Completo</h4><div class="comparacion-equipos">
        <div class="equipo-stats"><h5><img src="${fotoLocal}" alt="${local.nombre}">${local.nombre}<span class="partidos-analizados">Basado en ${local.estadisticas.partidosAnalizados} partidos</span></h5><div class="stats-lista">
          <div class="stat-item"><span class="stat-label">⚽ Goles esperados:</span><span class="stat-valor">${local.estadisticas.golesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Remates:</span><span class="stat-valor">${local.estadisticas.rematesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Remates al arco:</span><span class="stat-valor">${local.estadisticas.rematesArcoEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">⚽ Posesión:</span><span class="stat-valor">${local.estadisticas.posesionEsperada}%</span></div>
          <div class="stat-item"><span class="stat-label">⚽ Pases:</span><span class="stat-valor">${local.estadisticas.pasesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Precisión pases:</span><span class="stat-valor">${local.estadisticas.precisionPasesEsperada}%</span></div>
          <div class="stat-item"><span class="stat-label">⚠️ Faltas:</span><span class="stat-valor">${local.estadisticas.faltasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🟨 Tarjetas amarillas:</span><span class="stat-valor">${local.estadisticas.amarillasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🟥 Tarjetas rojas:</span><span class="stat-valor">${local.estadisticas.rojasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🚫 Fueras de lugar:</span><span class="stat-valor">${local.estadisticas.fueraLugarEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🚩 Corners:</span><span class="stat-valor">${local.estadisticas.cornersEsperados}</span></div>
        </div></div>
        <div class="equipo-stats"><h5><img src="${fotoVisitante}" alt="${visitante.nombre}">${visitante.nombre}<span class="partidos-analizados">Basado en ${visitante.estadisticas.partidosAnalizados} partidos</span></h5><div class="stats-lista">
          <div class="stat-item"><span class="stat-label">⚽ Goles esperados:</span><span class="stat-valor">${visitante.estadisticas.golesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Remates:</span><span class="stat-valor">${visitante.estadisticas.rematesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Remates al arco:</span><span class="stat-valor">${visitante.estadisticas.rematesArcoEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">⚽ Posesión:</span><span class="stat-valor">${visitante.estadisticas.posesionEsperada}%</span></div>
          <div class="stat-item"><span class="stat-label">⚽ Pases:</span><span class="stat-valor">${visitante.estadisticas.pasesEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🎯 Precisión pases:</span><span class="stat-valor">${visitante.estadisticas.precisionPasesEsperada}%</span></div>
          <div class="stat-item"><span class="stat-label">⚠️ Faltas:</span><span class="stat-valor">${visitante.estadisticas.faltasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🟨 Tarjetas amarillas:</span><span class="stat-valor">${visitante.estadisticas.amarillasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🟥 Tarjetas rojas:</span><span class="stat-valor">${visitante.estadisticas.rojasEsperadas}</span></div>
          <div class="stat-item"><span class="stat-label">🚫 Fueras de lugar:</span><span class="stat-valor">${visitante.estadisticas.fueraLugarEsperados}</span></div>
          <div class="stat-item"><span class="stat-label">🚩 Corners:</span><span class="stat-valor">${visitante.estadisticas.cornersEsperados}</span></div>
        </div></div>
      </div>
      <div class="mercados-apuestas"><h4>💰 Mercados de Apuestas</h4>${generarHTMLMercadosApuestas(pronostico.mercadosApuestas)}</div>
      <div class="metodologia"><h4>🔬 Metodología del Pronóstico</h4><div class="metodologia-info">
        <p><strong>Análisis basado en:</strong> Últimos 10 partidos de cada equipo</p>
        <p><strong>Factores considerados:</strong> Ventaja de local (+7%), desventaja de visitante (-3%)</p>
        <p><strong>Variables analizadas:</strong> Goles, remates, posesión, pases, faltas, tarjetas, corners</p>
        <p><strong>Algoritmo:</strong> Promedio ponderado con factores de rendimiento local/visitante</p>
      </div></div>
    </div>`;
}

/** Sección de mercados O/U y especiales */
export function generarHTMLMercadosApuestas(mercados) {
  const buildOverUnderRows = (items, label) => items.map(m => {
    const menosProb = Math.round(m.menos * 100);
    const masProb = Math.round(m.mas * 100);
    const masGanador = masProb >= menosProb;
    return `
      <div class="mercado-opciones">
        <div class="opcion-mercado ${!masGanador ? 'ganador' : ''}"><span class="opcion-label">-${m.linea} ${label}</span><span class="opcion-probabilidad">${menosProb}%</span></div>
        <div class="opcion-mercado ${masGanador ? 'ganador' : ''}"><span class="opcion-label">+${m.linea} ${label}</span><span class="opcion-probabilidad">${masProb}%</span></div>
      </div>`;
  }).join('');

  const sections = [];
  if (mercados.golesTotales) sections.push(`<div class="mercado-section"><h5>⚽ Goles Totales</h5>${buildOverUnderRows(mercados.golesTotales, 'goles')}</div>`);
  if (mercados.rematesTotales) sections.push(`<div class="mercado-section"><h5>🎯 Remates Totales</h5>${buildOverUnderRows(mercados.rematesTotales, 'remates')}</div>`);
  if (mercados.rematesArcoTotales) sections.push(`<div class="mercado-section"><h5>🎯 Remates al Arco</h5>${buildOverUnderRows(mercados.rematesArcoTotales, 'remates al arco')}</div>`);
  if (mercados.pasesTotales) sections.push(`<div class="mercado-section"><h5>📋 Pases Totales</h5>${buildOverUnderRows(mercados.pasesTotales, 'pases')}</div>`);
  if (mercados.faltasTotales) sections.push(`<div class="mercado-section"><h5>⚠️ Faltas Totales</h5>${buildOverUnderRows(mercados.faltasTotales, 'faltas')}</div>`);
  if (mercados.amarillasTotales) sections.push(`<div class="mercado-section"><h5>🟨 Tarjetas Amarillas</h5>${buildOverUnderRows(mercados.amarillasTotales, 'tarjetas')}</div>`);
  if (mercados.fueraLugarTotales) sections.push(`<div class="mercado-section"><h5>🚫 Fuera de Lugar</h5>${buildOverUnderRows(mercados.fueraLugarTotales, 'fuera de lugar')}</div>`);
  if (mercados.cornersTotales) sections.push(`<div class="mercado-section"><h5>🚩 Corners Totales</h5>${buildOverUnderRows(mercados.cornersTotales, 'corners')}</div>`);

  if (mercados.ambosMarcan) sections.push(`
    <div class="mercado-section">
      <h5>⚽ Ambos Marcan</h5>
      <div class="mercado-opciones">
        <div class="opcion-mercado ${mercados.ambosMarcan.primerTiempo.si > mercados.ambosMarcan.primerTiempo.no ? 'ganador' : ''}"><span class="opcion-label">Sí (1er Tiempo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.primerTiempo.si}%</span></div>
        <div class="opcion-mercado ${mercados.ambosMarcan.primerTiempo.no >= mercados.ambosMarcan.primerTiempo.si ? 'ganador' : ''}"><span class="opcion-label">No (1er Tiempo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.primerTiempo.no}%</span></div>
      </div>
      <div class="mercado-opciones">
        <div class="opcion-mercado ${mercados.ambosMarcan.segundoTiempo.si > mercados.ambosMarcan.segundoTiempo.no ? 'ganador' : ''}"><span class="opcion-label">Sí (2do Tiempo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.segundoTiempo.si}%</span></div>
        <div class="opcion-mercado ${mercados.ambosMarcan.segundoTiempo.no >= mercados.ambosMarcan.segundoTiempo.si ? 'ganador' : ''}"><span class="opcion-label">No (2do Tiempo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.segundoTiempo.no}%</span></div>
      </div>
      <div class="mercado-opciones">
        <div class="opcion-mercado ${mercados.ambosMarcan.partidoCompleto.si > mercados.ambosMarcan.partidoCompleto.no ? 'ganador' : ''}"><span class="opcion-label">Sí (Partido Completo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.partidoCompleto.si}%</span></div>
        <div class="opcion-mercado ${mercados.ambosMarcan.partidoCompleto.no >= mercados.ambosMarcan.partidoCompleto.si ? 'ganador' : ''}"><span class="opcion-label">No (Partido Completo)</span><span class="opcion-probabilidad">${mercados.ambosMarcan.partidoCompleto.no}%</span></div>
      </div>
    </div>`);

  if (mercados.roja !== undefined) sections.push(`
    <div class="mercado-section"><h5>🟥 Tarjeta Roja</h5>
      <div class="mercado-opciones"><div class="opcion-mercado ganador"><span class="opcion-label">Tarjeta Roja (Probabilidad)</span><span class="opcion-probabilidad">${mercados.roja}%</span></div></div>
    </div>`);

  return `<div class="mercados-container">${sections.join('')}</div>`;
}
