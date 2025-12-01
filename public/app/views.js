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
  // Oculta todas las vistas y activa únicamente la solicitada por id.
  // Requiere que cada contenedor tenga la clase .vista y el id único.
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  document.getElementById(vistaId).classList.add('activa');
}

// Helpers para botones de navegación
export function mostrarCrearLiga() { mostrarVista('vista-crear-liga'); }
export function volverInicio() {
  // Regresa a la pantalla inicial y dispara recarga (si se decide en el futuro optimizar,
  // se podría agregar control de timestamp para no recargar en exceso).
  mostrarVista('vista-inicio');
  cargarLigasSiNecesario();
}
export function volverALiga() {
  // Si hay liga activa se re-renderiza para refrescar datos (tabla / partidos actualizados).
  ligaActual ? verLiga(ligaActual.id) : volverInicio();
}

// Carga de ligas al volver al inicio
async function cargarLigasSiNecesario() {
  // En este enfoque siempre se emite evento; la optimización (no recargar si ya se tiene cache)
  // podría implementarse agregando una marca temporal global y comparando.
  const evt = new CustomEvent('recargar-ligas');
  window.dispatchEvent(evt);
}

/**
 * Cambia de tab dentro de la vista de liga y dispara acciones según tab activo
 * @param {string} tabName - nombre de tab (tabla|equipos|partidos|pronosticos)
 */
export function cambiarTab(tabName) {
  // Intercambio visual de tabs: desactiva todos los botones y contenidos.
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activa'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('activa'));

  // El navegador expone el evento global; se usa para añadir la clase al botón pulsado.
  const btn = (window.event && window.event.target) || null;
  if (btn) btn.classList.add('activa');
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add('activa');

  // Tab dinámica: pronósticos se generan bajo demanda para evitar cálculo innecesario
  // cuando el usuario no los está viendo.
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
