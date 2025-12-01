// teams.js
// Operaciones relacionadas con equipos: edición individual y manejo de fotos.

import { API_URL } from './api.js';
import { ligaActual, setLigaActual } from './state.js';
import { mostrarVista } from './views.js';

// Consideraciones:
// - Se usa window.equipoActual para evitar pasar el objeto entre funciones y mantener simplicidad.
//   En una refactorización se podría almacenar en state.js.
// - Las imágenes se manejan como base64 embebido para no requerir almacenamiento externo.
//   Limitar tamaño sería recomendable (validar file.size) para evitar grandes strings.

/** Abre modal/pantalla para editar un equipo existente */
export function editarEquipo(equipoId) {
  // Abre vista de edición de un equipo existente. Carga foto previa o placeholder.
  const equipo = ligaActual?.equipos?.find(e => e.id === equipoId);
  if (!equipo) { alert('Equipo no encontrado'); return; }

  const foto = equipo.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E`;
  document.getElementById('editar-equipo-titulo').textContent = `Editar: ${equipo.nombre}`;
  document.getElementById('editar-equipo-preview').src = foto;
  document.getElementById('editar-equipo-nombre').value = equipo.nombre;

  // Guardar referencia temporal del equipo editado
  window.equipoActual = equipo;
  const btnEliminarFoto = document.getElementById('btn-eliminar-foto');
  btnEliminarFoto.style.display = equipo.foto ? 'block' : 'none';
  document.getElementById('editar-equipo-foto-input').value = '';

  mostrarVista('vista-editar-equipo');
}

/** Actualiza el preview de la imagen de equipo durante la edición */
export function previewFotoEquipo(input) {
  // Lee archivo y actualiza la vista. Persistencia real ocurre al guardar el formulario principal.
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('editar-equipo-preview').src = e.target.result;
    document.getElementById('btn-eliminar-foto').style.display = 'block';
    input.dataset.base64 = e.target.result; // persistir temporalmente
  };
  reader.readAsDataURL(file);
}

/** Quita la foto actual del equipo en edición */
export function eliminarFotoEquipo() {
  // Restablece a placeholder y marca dataset como null para indicar eliminación.
  document.getElementById('editar-equipo-preview').src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${window.equipoActual.id}%3C/text%3E%3C/svg%3E`;
  document.getElementById('btn-eliminar-foto').style.display = 'none';
  const input = document.getElementById('editar-equipo-foto-input');
  input.value = '';
  input.dataset.base64 = null;
}

/** Persiste cambios del equipo actual (nombre/foto) */
export async function guardarCambiosEquipo(e) {
  // Envía PUT con el array completo de equipos actualizados para mantener atomicidad.
  e.preventDefault();
  const nombre = document.getElementById('editar-equipo-nombre').value;
  const fotoInput = document.getElementById('editar-equipo-foto-input');
  const fotoBase64 = fotoInput.dataset.base64 || window.equipoActual.foto || null;

  // Actualizar en memoria antes de enviar
  window.equipoActual.nombre = nombre;
  window.equipoActual.foto = fotoBase64;

  try {
    const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/equipos`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipos: ligaActual.equipos })
    });
    const data = await response.json();
    if (!response.ok) { alert(data.error || 'Error al guardar los cambios'); return; }
    setLigaActual(data);
    alert('Cambios guardados exitosamente');
    // Volver a la liga para ver cambios
    import('./leagues.js').then(m => m.verLiga(data.id));
  } catch (error) {
    console.error('Error al guardar cambios del equipo:', error);
    alert('Error al guardar los cambios');
  }
}
