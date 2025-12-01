// api.js
// Punto único de configuración para la API del backend.
// Centralizar la URL evita tener cadenas repetidas en múltiples módulos.
// Si en el futuro se despliega en producción, puede leerse desde:
//  - window.__API_BASE__ inyectado por el servidor
//  - una variable de entorno procesada en build (ej: Vite/webpack)
//  - un archivo de configuración externo (config.json)
// Buenas prácticas:
//  - Mantener solo la parte base, NO incluir barras finales inconsistentes.
//  - Evitar concatenar manualmente parámetros; usar URLSearchParams donde aplique.

export const API_URL = 'http://localhost:3000/api';
// Uso típico:
// fetch(`${API_URL}/ligas`)
// fetch(`${API_URL}/ligas/1`)
// Mantener siempre el patrón `${API_URL}/recurso` para claridad.
