// matches.js
// Gestión de partidos: preview, alta/edición, registro de resultados y formulario de estadísticas.

import { API_URL } from './api.js';
import { ligaActual, setPartidoActual, partidoActual } from './state.js';
import { verDetallePartido as openDetallePartido } from './matches.js';
import { verLiga } from './leagues.js';
import { mostrarVista } from './views.js';

/** Muestra la vista previa del enfrentamiento según selects de equipos */
export function actualizarPreviewPartidos() {
  const localId = parseInt(document.getElementById('partido-local').value);
  const visitanteId = parseInt(document.getElementById('partido-visitante').value);
  const previewContainer = document.getElementById('preview-partido');

  if (!localId || !visitanteId || localId === visitanteId) {
    previewContainer.style.display = 'none';
    return;
  }

  const local = ligaActual.equipos.find(e => e.id === localId);
  const visitante = ligaActual.equipos.find(e => e.id === visitanteId);
  if (!local || !visitante) { previewContainer.style.display = 'none'; return; }

  const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
  const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;
  document.getElementById('preview-logo-local').src = fotoLocal;
  document.getElementById('preview-nombre-local').textContent = local.nombre;
  document.getElementById('preview-logo-visitante').src = fotoVisitante;
  document.getElementById('preview-nombre-visitante').textContent = visitante.nombre;
  previewContainer.style.display = 'block';
}

/** Alta de un nuevo partido validando duplicidad y equipos distintos */
export async function handleAgregarPartido(e) {
  e.preventDefault();
  const localId = parseInt(document.getElementById('partido-local').value);
  const visitanteId = parseInt(document.getElementById('partido-visitante').value);
  const jornada = parseInt(document.getElementById('partido-jornada').value);

  if (localId === visitanteId) { alert('Un equipo no puede jugar contra sí mismo'); return; }

  const partidoExistente = ligaActual.partidos.find(p => p.jornada === jornada &&
    ((p.localId === localId && p.visitanteId === visitanteId) || (p.localId === visitanteId && p.visitanteId === localId)));
  if (partidoExistente) { alert('Estos equipos ya se enfrentan en esta jornada'); return; }

  try {
    const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/partidos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId, visitanteId, jornada })
    });
    const data = await response.json();
    if (!response.ok) { alert(data.error || 'Error al agregar el partido'); return; }
    verLiga(ligaActual.id);
    document.getElementById('form-agregar-partido').reset();
  } catch (error) {
    console.error('Error al agregar partido:', error);
    alert('Error al agregar el partido');
  }
}

/** Lista de partidos pendientes (si se usa este bloque en la UI) */
export function mostrarPartidosPendientes(partidos, equipos) {
  const container = document.getElementById('partidos-pendientes');
  const pendientes = Array.isArray(partidos) ? partidos.filter(p => !p.jugado) : [];
  if (pendientes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No hay partidos pendientes</p></div>';
    return;
  }
  container.innerHTML = pendientes.map(partido => {
    const local = equipos.find(e => e.id === partido.localId);
    const visitante = equipos.find(e => e.id === partido.visitanteId);
    const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
    const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;
    return `
      <div class="partido-item">
        <div class="partido-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${fotoLocal}" alt="${local.nombre}" class="partido-equipo-logo-pequeno">
            <span>${local.nombre}</span>
          </div>
          <span class="jornada-badge">Jornada ${partido.jornada}</span>
          <div style="display: flex; align-items: center; gap: 12px; flex-direction: row-reverse;">
            <img src="${fotoVisitante}" alt="${visitante.nombre}" class="partido-equipo-logo-pequeno">
            <span>${visitante.nombre}</span>
          </div>
        </div>
        <form class="resultado-form" onsubmit="registrarResultado(event, ${partido.id})">
          <input type="number" id="goles-local-${partido.id}" min="0" placeholder="${local.nombre}" required>
          <span style="font-weight: bold;">-</span>
          <input type="number" id="goles-visitante-${partido.id}" min="0" placeholder="${visitante.nombre}" required>
          <button type="submit" class="btn btn-success">Guardar</button>
        </form>
      </div>`;
  }).join('');
}

/** PUT de resultado simple del partido (sin estadísticas) */
export async function registrarResultado(e, partidoId) {
  e.preventDefault();
  const golesLocal = parseInt(document.getElementById(`goles-local-${partidoId}`).value);
  const golesVisitante = parseInt(document.getElementById(`goles-visitante-${partidoId}`).value);
  try {
    const response = await fetch(`${API_URL}/partidos/${partidoId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ golesLocal, golesVisitante })
    });
    await response.json();
    verLiga(ligaActual.id);
  } catch (error) {
    console.error('Error al registrar resultado:', error);
    alert('Error al registrar el resultado');
  }
}

/** Abre formulario de estadísticas para un partido concreto */
export async function verDetallePartido(partidoId) {
  if (!ligaActual) { alert('Por favor, selecciona una liga primero'); return; }
  const partido = ligaActual.partidos.find(p => p.id === partidoId);
  if (!partido) { alert('No se encontró el partido'); return; }
  setPartidoActual(partido);

  const local = ligaActual.equipos.find(e => e.id === partido.localId);
  const visitante = ligaActual.equipos.find(e => e.id === partido.visitanteId);

  document.getElementById('detalle-partido-titulo').textContent = `${local.nombre} vs ${visitante.nombre} - Jornada ${partido.jornada}`;
  const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
  const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;

  document.getElementById('titulo-stats-local').innerHTML = `<img class="detalle-equipo-logo" src="${fotoLocal}" alt="${local.nombre}" title="${local.nombre}"> ${local.nombre}`;
  document.getElementById('titulo-stats-visitante').innerHTML = `<img class="detalle-equipo-logo" src="${fotoVisitante}" alt="${visitante.nombre}" title="${visitante.nombre}"> ${visitante.nombre}`;

  if (partido.estadisticas) {
    const stats = partido.estadisticas;
    document.getElementById('local-remates').value = stats.local.remates || 0;
    document.getElementById('local-remates-arco').value = stats.local.rematesArco || 0;
    document.getElementById('local-posesion').value = stats.local.posesion || 0;
    document.getElementById('local-pases').value = stats.local.pases || 0;
    document.getElementById('local-precision-pases').value = stats.local.precisionPases || 0;
    document.getElementById('local-faltas').value = stats.local.faltas || 0;
    document.getElementById('local-amarillas').value = stats.local.amarillas || 0;
    document.getElementById('local-rojas').value = stats.local.rojas || 0;
    document.getElementById('local-fuera-lugar').value = stats.local.fueraLugar || 0;
    document.getElementById('local-corners').value = stats.local.corners || 0;

    document.getElementById('visitante-remates').value = stats.visitante.remates || 0;
    document.getElementById('visitante-remates-arco').value = stats.visitante.rematesArco || 0;
    document.getElementById('visitante-posesion').value = stats.visitante.posesion || 0;
    document.getElementById('visitante-pases').value = stats.visitante.pases || 0;
    document.getElementById('visitante-precision-pases').value = stats.visitante.precisionPases || 0;
    document.getElementById('visitante-faltas').value = stats.visitante.faltas || 0;
    document.getElementById('visitante-amarillas').value = stats.visitante.amarillas || 0;
    document.getElementById('visitante-rojas').value = stats.visitante.rojas || 0;
    document.getElementById('visitante-fuera-lugar').value = stats.visitante.fueraLugar || 0;
    document.getElementById('visitante-corners').value = stats.visitante.corners || 0;
  } else {
    document.querySelectorAll('#form-detalle-partido input[type="number"]').forEach(input => { input.value = 0; });
  }

  mostrarVista('vista-detalle-partido');
  configurarCalculosAutomaticos();
}

/** Conecta inputs del formulario para calcular totales automáticamente */
export function configurarCalculosAutomaticos() {
  const localGolesPrimero = document.getElementById('local-goles-primero');
  const localGolesSegundo = document.getElementById('local-goles-segundo');
  const localGolesDisplay = document.getElementById('goles-local-display');

  const visitanteGolesPrimero = document.getElementById('visitante-goles-primero');
  const visitanteGolesSegundo = document.getElementById('visitante-goles-segundo');
  const visitanteGolesDisplay = document.getElementById('goles-visitante-display');

  const localPosesion = document.getElementById('local-posesion');
  const visitantePosesion = document.getElementById('visitante-posesion');

  const calcularGolesLocal = () => {
    const total = (parseInt(localGolesPrimero.value) || 0) + (parseInt(localGolesSegundo.value) || 0);
    localGolesDisplay.textContent = total;
  };
  const calcularGolesVisitante = () => {
    const total = (parseInt(visitanteGolesPrimero.value) || 0) + (parseInt(visitanteGolesSegundo.value) || 0);
    visitanteGolesDisplay.textContent = total;
  };
  const calcularPosesionAutomatica = () => {
    const posesionLocal = parseFloat(localPosesion.value) || 0;
    const posesionVisitante = Math.max(0, Math.min(100, 100 - posesionLocal));
    visitantePosesion.value = posesionVisitante;
  };

  [localGolesPrimero, localGolesSegundo].forEach(el => {
    el.addEventListener('change', calcularGolesLocal);
    el.addEventListener('input', calcularGolesLocal);
  });
  [visitanteGolesPrimero, visitanteGolesSegundo].forEach(el => {
    el.addEventListener('change', calcularGolesVisitante);
    el.addEventListener('input', calcularGolesVisitante);
  });
  localPosesion.addEventListener('change', calcularPosesionAutomatica);
  localPosesion.addEventListener('input', calcularPosesionAutomatica);

  calcularGolesLocal();
  calcularGolesVisitante();
  calcularPosesionAutomatica();
}

/** Alias para abrir edición de un partido desde la lista */
export function editarPartido(partidoId) { verDetallePartido(partidoId); }

/** Guarda el detalle de estadísticas completas del partido */
export async function handleGuardarDetallePartido(e) {
  e.preventDefault();
  const golesLocal = parseInt(document.getElementById('goles-local-display').textContent) || 0;
  const golesVisitante = parseInt(document.getElementById('goles-visitante-display').textContent) || 0;

  const golesPorTiempo = {
    localPrimero: parseInt(document.getElementById('local-goles-primero').value) || 0,
    localSegundo: parseInt(document.getElementById('local-goles-segundo').value) || 0,
    visitantePrimero: parseInt(document.getElementById('visitante-goles-primero').value) || 0,
    visitanteSegundo: parseInt(document.getElementById('visitante-goles-segundo').value) || 0
  };

  if (golesPorTiempo.localPrimero + golesPorTiempo.localSegundo !== golesLocal ||
      golesPorTiempo.visitantePrimero + golesPorTiempo.visitanteSegundo !== golesVisitante) {
    alert('Los goles por tiempo deben sumar el total de goles del equipo');
    return;
  }

  const estadisticas = {
    local: {
      remates: parseFloat(document.getElementById('local-remates').value) || 0,
      rematesArco: parseFloat(document.getElementById('local-remates-arco').value) || 0,
      posesion: parseFloat(document.getElementById('local-posesion').value) || 50,
      pases: parseFloat(document.getElementById('local-pases').value) || 0,
      precisionPases: parseFloat(document.getElementById('local-precision-pases').value) || 0,
      faltas: parseFloat(document.getElementById('local-faltas').value) || 0,
      amarillas: parseFloat(document.getElementById('local-amarillas').value) || 0,
      rojas: parseFloat(document.getElementById('local-rojas').value) || 0,
      fueraLugar: parseFloat(document.getElementById('local-fuera-lugar').value) || 0,
      corners: parseFloat(document.getElementById('local-corners').value) || 0
    },
    visitante: {
      remates: parseFloat(document.getElementById('visitante-remates').value) || 0,
      rematesArco: parseFloat(document.getElementById('visitante-remates-arco').value) || 0,
      posesion: parseFloat(document.getElementById('visitante-posesion').value) || 50,
      pases: parseFloat(document.getElementById('visitante-pases').value) || 0,
      precisionPases: parseFloat(document.getElementById('visitante-precision-pases').value) || 0,
      faltas: parseFloat(document.getElementById('visitante-faltas').value) || 0,
      amarillas: parseFloat(document.getElementById('visitante-amarillas').value) || 0,
      rojas: parseFloat(document.getElementById('visitante-rojas').value) || 0,
      fueraLugar: parseFloat(document.getElementById('visitante-fuera-lugar').value) || 0,
      corners: parseFloat(document.getElementById('visitante-corners').value) || 0
    }
  };

  try {
    const response = await fetch(`${API_URL}/partidos/${(partidoActual?.id) || 0}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ golesLocal, golesVisitante, golesPorTiempo, estadisticas })
    });
    await response.json();
    verLiga(ligaActual.id);
  } catch (error) {
    console.error('Error al guardar detalles del partido:', error);
    alert('Error al guardar los detalles del partido');
  }
}
