// views.js
// Navegación entre vistas y tabs. Mantiene la UI en sincronía con acciones.

import { ligaActual } from './state.js';
import { verLiga } from './leagues.js';
import { generarPronosticos } from './predictions.js';

/**
 * Muestra una vista por id y oculta las otras
 * @param {string} vistaId - id del contenedor .vista a activar
 */
export function mostrarVista(vistaId) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  document.getElementById(vistaId).classList.add('activa');
}

// Helpers para botones de navegación
export function mostrarCrearLiga() { mostrarVista('vista-crear-liga'); }
export function volverInicio() { mostrarVista('vista-inicio'); cargarLigasSiNecesario(); }
export function volverALiga() { ligaActual ? verLiga(ligaActual.id) : volverInicio(); }

// Carga de ligas al volver al inicio
async function cargarLigasSiNecesario() {
  // Evita recarga innecesaria si ya estamos en inicio; aquí simplemente disparar evento custom si algún día se necesita
  const evt = new CustomEvent('recargar-ligas');
  window.dispatchEvent(evt);
}

/**
 * Cambia de tab dentro de la vista de liga y dispara acciones según tab activo
 * @param {string} tabName - nombre de tab (tabla|equipos|partidos|pronosticos)
 */
export function cambiarTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activa'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('activa'));

  // Usamos event del navegador para obtener el botón pulsado si existe
  const btn = (window.event && window.event.target) || null;
  if (btn) btn.classList.add('activa');
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add('activa');

  if (tabName === 'pronosticos') {
    if (window.pronosticador) {
      generarPronosticos();
    } else {
      const container = document.getElementById('pronosticos-container');
      container.innerHTML = `
        <div class="sin-pronosticos">
          <h4>❌ Error en el sistema de pronósticos</h4>
          <p>El sistema de pronósticos no se pudo cargar correctamente.<br>Por favor, recarga la página e intenta nuevamente.</p>
        </div>`;
    }
  }
}
