// main.js
// Punto de entrada de la app en el navegador. Configura el pronosticador,
// registra listeners, y expone funciones usadas en atributos inline (onclick).

import { cargarLigas, handleCrearLiga, handleEditarEquipos, previewFoto, verLiga } from './leagues.js';
import { editarEquipo, previewFotoEquipo, eliminarFotoEquipo, guardarCambiosEquipo } from './teams.js';
import { cambiarTab, mostrarCrearLiga, volverInicio, volverALiga } from './views.js';
import { actualizarPreviewPartidos, handleAgregarPartido, registrarResultado, verDetallePartido, editarPartido, handleGuardarDetallePartido } from './matches.js';
import { generarPronosticos, verDetallePronostico } from './predictions.js';

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof PronosticadorPartidos !== 'undefined') {
      window.pronosticador = new PronosticadorPartidos();
      console.log('✅ Sistema de pronósticos cargado correctamente');
    } else {
      console.error('❌ Error: No se pudo cargar el sistema de pronósticos');
    }
  } catch (error) {
    console.error('❌ Error al inicializar pronosticador:', error);
  }

  cargarLigas();

  // Soportar recargas de lista desde otras vistas
  window.addEventListener('recargar-ligas', cargarLigas);

  // Formularios
  document.getElementById('form-crear-liga')?.addEventListener('submit', handleCrearLiga);
  document.getElementById('form-editar-equipos')?.addEventListener('submit', handleEditarEquipos);
  document.getElementById('form-agregar-partido')?.addEventListener('submit', handleAgregarPartido);
  document.getElementById('form-detalle-partido')?.addEventListener('submit', handleGuardarDetallePartido);
  document.getElementById('form-editar-equipo')?.addEventListener('submit', guardarCambiosEquipo);
});

// Exponer funciones necesarias para handlers inline del HTML y HTML generado
Object.assign(window, {
  // Navegación
  mostrarCrearLiga, volverInicio, volverALiga, cambiarTab,
  // Ligas y equipos
  verLiga, previewFoto, editarEquipo, previewFotoEquipo, eliminarFotoEquipo,
  // Partidos
  actualizarPreviewPartidos, handleAgregarPartido, registrarResultado, verDetallePartido, editarPartido,
  // Pronósticos
  generarPronosticos, verDetallePronostico,
});
