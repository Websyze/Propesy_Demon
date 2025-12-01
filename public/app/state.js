// state.js
// Estado global mínimo compartido entre módulos usando ES Modules.
// Exportamos setters para modificaciones y valores con enlace vivo para lecturas.

// Liga actualmente seleccionada en la UI
let ligaActual = null;
// Partido actualmente abierto en el formulario de estadísticas
let partidoActual = null;
// Cache de pronósticos para permitir abrir la vista detallada sin recalcular
let pronosticosGlobales = [];

export function setLigaActual(nueva) { ligaActual = nueva; }
export function setPartidoActual(nuevo) { partidoActual = nuevo; }
export function setPronosticosGlobales(nuevos) { pronosticosGlobales = Array.isArray(nuevos) ? nuevos : []; }

export { ligaActual, partidoActual, pronosticosGlobales };
