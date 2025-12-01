// leagues.js
// Gestión de ligas: cargar, crear, editar equipos y renderizar tabla/partidos.

import { API_URL } from './api.js';
import { ligaActual, setLigaActual } from './state.js';
import { mostrarVista } from './views.js';

// Nota general del módulo:
// - Se prioriza claridad sobre abstracción: cada flujo (cargar, crear, editar) manipula directamente el DOM.
// - En una evolución futura podría extraerse la generación de HTML a helpers reutilizables o plantillas.
// - Se confía en la API para devolver estructuras consistentes; validaciones básicas protegen estados vacíos.

/** Carga y renderiza la lista de ligas en la vista de inicio */
export async function cargarLigas() {
  // Descarga listado ligero de ligas y pinta tarjetas en la vista inicio.
  // Si se requiere paginación o búsqueda, aquí sería el punto de extensión.
  try {
    const response = await fetch(`${API_URL}/ligas`);
    const ligas = await response.json();
    const container = document.getElementById('ligas-container');

    if (!Array.isArray(ligas) || ligas.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No hay ligas creadas. ¡Crea tu primera liga!</p></div>';
      return;
    }

    container.innerHTML = ligas.map(liga => `
      <div class="liga-card" onclick="verLiga(${liga.id})">
        <h4>🏆 ${liga.nombre}</h4>
        <p>${liga.equipos.length} equipos</p>
        <p>${liga.partidos.length} partidos</p>
      </div>`).join('');
  } catch (error) {
    console.error('Error al cargar ligas:', error);
  }
}

/** Maneja el submit para crear una liga nueva */
export async function handleCrearLiga(e) {
  // Crea una liga y despliega inmediatamente el paso de edición de equipos.
  // El backend genera ids y la estructura base de equipos vacíos.
  e.preventDefault();
  const nombre = document.getElementById('nombre-liga').value;
  const numEquipos = parseInt(document.getElementById('num-equipos').value);

  try {
    const response = await fetch(`${API_URL}/ligas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, numEquipos })
    });

    const liga = await response.json();
    setLigaActual(liga);

    // Construir inputs para editar nombres y fotos de equipos
    const equiposInputs = document.getElementById('equipos-inputs');
    equiposInputs.innerHTML = liga.equipos.map(equipo => `
      <div class="equipo-card">
        <div class="equipo-logo-container">
          <img id="preview-${equipo.id}" class="equipo-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E" alt="Logo" onclick="document.getElementById('foto-${equipo.id}').click()" style="cursor: pointer;" title="Haz clic para cambiar la imagen">
          <p style="font-size: 0.8em; color: #999; margin-top: 8px; text-align: center;">Haz clic para agregar foto</p>
          <input type="file" id="foto-${equipo.id}" accept="image/*" class="foto-input" onchange="previewFoto(this, ${equipo.id})">
        </div>
        <div class="form-group">
          <label>Nombre del Equipo:</label>
          <input type="text" id="equipo-${equipo.id}" value="${equipo.nombre}" required>
        </div>
      </div>`).join('');

    mostrarVista('vista-editar-equipos');
    document.getElementById('form-crear-liga').reset();
  } catch (error) {
    console.error('Error al crear liga:', error);
    alert('Error al crear la liga: ' + error.message);
  }
}

/** Lee dataURL de imagen seleccionada y actualiza el preview */
export function previewFoto(input, equipoId) {
  // Lectura de archivo local -> base64 -> actualización de <img> para feedback rápido al usuario.
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(`preview-${equipoId}`).src = e.target.result;
    input.dataset.base64 = e.target.result; // Guardar temporalmente
  };
  reader.readAsDataURL(file);
}

/** Envía al backend los cambios de nombre/foto de todos los equipos */
export async function handleEditarEquipos(e) {
  // Construye un nuevo array de equipos con los nombres/fotos editados y lo envía.
  // Se reusa la ruta PUT /ligas/:id/equipos para actualizar en bloque.
  e.preventDefault();
  const equiposActualizados = ligaActual.equipos.map(equipo => {
    const fotoInput = document.getElementById(`foto-${equipo.id}`);
    const fotoBase64 = (fotoInput && fotoInput.dataset.base64) || equipo.foto || null;
    return { ...equipo, nombre: document.getElementById(`equipo-${equipo.id}`).value, foto: fotoBase64 };
  });

  try {
    const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/equipos`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipos: equiposActualizados })
    });
    const ligaActualizada = await response.json();
    verLiga(ligaActualizada.id);
  } catch (error) {
    console.error('Error al actualizar equipos:', error);
    alert('Error al actualizar los equipos');
  }
}

/** Carga una liga, su tabla, equipos y partidos, y activa la vista */
export async function verLiga(ligaId) {
  // Carga versión completa de la liga (tabla calculada, equipos, partidos) y actualiza la vista principal.
  // Re-renderiza tabs para asegurar estado visual consistente.
  try {
    const response = await fetch(`${API_URL}/ligas/${ligaId}`);
    const liga = await response.json();
    setLigaActual(liga);

    document.getElementById('liga-titulo').textContent = liga.nombre;
    mostrarTabla(liga.tabla);
    cargarSelectsEquipos(liga.equipos);
    mostrarEquiposTab(liga.equipos);
    mostrarPartidos(liga.partidos, liga.equipos);

    mostrarVista('vista-liga');

    // Activar tab inicial (Tabla)
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activa'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('activa'));
    document.querySelector('.tab-btn').classList.add('activa');
    document.getElementById('tab-tabla').classList.add('activa');
  } catch (error) {
    console.error('Error al cargar liga:', error);
    alert('Error al cargar la liga');
  }
}

/** Renderiza la tabla de posiciones */
function mostrarTabla(tabla) {
  // Renderiza la tabla de posiciones. Si está vacía muestra mensaje.
  const tbody = document.querySelector('#tabla-posiciones tbody');
  if (!Array.isArray(tabla) || tabla.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No hay datos disponibles</td></tr>';
    return;
  }
  tbody.innerHTML = tabla.map((equipo, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        <div class="equipo-tabla-cell">
          <img class="equipo-tabla-logo" src="${equipo.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E`}" alt="${equipo.nombre}">
          <strong>${equipo.nombre}</strong>
        </div>
      </td>
      <td>${equipo.pj}</td>
      <td>${equipo.pg}</td>
      <td>${equipo.pe}</td>
      <td>${equipo.pp}</td>
      <td>${equipo.gf}</td>
      <td>${equipo.gc}</td>
      <td>${equipo.dg >= 0 ? '+' : ''}${equipo.dg}</td>
      <td><strong>${equipo.pts}</strong></td>
    </tr>`).join('');
}

/** Rellena selects de equipos en la UI de partidos */
function cargarSelectsEquipos(equipos) {
  // Llena selects para creación de partidos y añade dataset con foto (posible uso futuro para previews).
  const selectLocal = document.getElementById('partido-local');
  const selectVisitante = document.getElementById('partido-visitante');
  const options = equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  selectLocal.innerHTML = options;
  selectVisitante.innerHTML = options;
  equipos.forEach(e => {
    selectLocal.dataset[`foto-${e.id}`] = e.foto || null;
    selectVisitante.dataset[`foto-${e.id}`] = e.foto || null;
  });
}

/** Muestra tarjetas de equipos en el tab Equipos */
function mostrarEquiposTab(equipos) {
  // Genera tarjetas clicables para entrar a edición individual de cada equipo.
  const container = document.getElementById('equipos-lista-tab');
  container.innerHTML = equipos.map(equipo => {
    const foto = equipo.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E`;
    return `
      <div class="equipo-card-tab" onclick="editarEquipo(${equipo.id})">
        <img class="equipo-card-tab-logo" src="${foto}" alt="${equipo.nombre}">
        <div class="equipo-card-tab-nombre">${equipo.nombre}</div>
      </div>`;
  }).join('');
}

/** Lista de partidos por jornada en la vista Liga */
function mostrarPartidos(partidos, equipos) {
  // Agrupa partidos por jornada para una lectura cronológica y muestra estado (jugado / con stats / pendiente).
  const container = document.getElementById('partidos-lista');
  if (!Array.isArray(partidos) || partidos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No hay partidos programados</p></div>';
    return;
  }

  const partidosPorJornada = {};
  partidos.forEach(p => { (partidosPorJornada[p.jornada] ||= []).push(p); });

  container.innerHTML = Object.entries(partidosPorJornada)
    .sort(([a],[b]) => a - b)
    .map(([jornada, lista]) => `
      <h4 style="margin-top: 20px; color: #667eea;">Jornada ${jornada}</h4>
      ${lista.map(partido => {
        const local = equipos.find(e => e.id === partido.localId);
        const visitante = equipos.find(e => e.id === partido.visitanteId);
        const tieneEst = partido.estadisticas ? '<span class="stats-badge">📊 Stats</span>' : '';
        const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
        const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;
        return `
          <div class="partido-item ${partido.jugado ? 'partido-jugado' : ''} ${partido.estadisticas ? 'partido-con-stats' : ''}"
               onclick="verDetallePartido(${partido.id})">
            <div class="partido-equipos-visual">
              <div class="equipo-partido-card">
                <img class="partido-equipo-logo" src="${fotoLocal}" alt="${local.nombre}">
                <span class="partido-equipo-nombre">${local.nombre}</span>
              </div>
              <div class="vs-badge">VS</div>
              <div class="equipo-partido-card">
                <img class="partido-equipo-logo" src="${fotoVisitante}" alt="${visitante.nombre}">
                <span class="partido-equipo-nombre">${visitante.nombre}</span>
              </div>
              ${tieneEst}
            </div>
            ${partido.jugado ? `
              <div class="resultado-final">
                ${partido.golesLocal} - ${partido.golesVisitante}
                <button onclick="event.stopPropagation(); editarPartido(${partido.id})" class="btn-editar">✏️ Editar</button>
              </div>` : '<p style="color: #999; margin-top: 5px;">Pendiente - Click para agregar detalles</p>'}
          </div>`;
      }).join('')}
    `).join('');
}
