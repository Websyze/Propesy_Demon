// state.js
// Pequeño contenedor de estado global compartido entre módulos (patrón módulo singleton).
// En lugar de usar un framework (React/Vue) se mantiene esto ligero y explícito.
// Nota: Al importar { ligaActual } en otro módulo se obtiene una REFERENCIA al valor actual,
// no un snapshot de un momento anterior (porque la variable se reevalúa al leer).
// Para mutaciones se expone un set* que facilita instrumentar lógica adicional futuramente
// (ej: disparar eventos, logs, persistencia) sin cambiar los puntos de uso.

// Liga actualmente seleccionada en la UI
let ligaActual = null;
// Partido actualmente abierto en el formulario de estadísticas
let partidoActual = null;
// Cache de pronósticos para permitir abrir la vista detallada sin recalcular
let pronosticosGlobales = [];

export function setLigaActual(nueva) {
	// Posible hook futuro: validar estructura de liga, normalizar campos.
	ligaActual = nueva;
}
export function setPartidoActual(nuevo) {
	// Posible hook futuro: limpiar formularios previos, invalidar caches.
	partidoActual = nuevo;
}
export function setPronosticosGlobales(nuevos) {
	// Se fuerza a array para evitar errores de recorrido en vistas.
	pronosticosGlobales = Array.isArray(nuevos) ? nuevos : [];
}

export { ligaActual, partidoActual, pronosticosGlobales };
