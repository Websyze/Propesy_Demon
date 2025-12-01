// app.js
const API_URL = 'http://localhost:3000/api';

let ligaActual = null;
let partidoActual = null;
let pronosticosGlobales = []; // Almacenar pronósticos para acceso en vista detallada

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar pronosticador
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
    
    document.getElementById('form-crear-liga').addEventListener('submit', handleCrearLiga);
    document.getElementById('form-editar-equipos').addEventListener('submit', handleEditarEquipos);
    document.getElementById('form-agregar-partido').addEventListener('submit', handleAgregarPartido);
    document.getElementById('form-detalle-partido').addEventListener('submit', handleGuardarDetallePartido);
    document.getElementById('form-editar-equipo').addEventListener('submit', guardarCambiosEquipo);
});

// Navegación entre vistas
function mostrarVista(vistaId) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    document.getElementById(vistaId).classList.add('activa');
}

function mostrarCrearLiga() {
    mostrarVista('vista-crear-liga');
}

function volverInicio() {
    mostrarVista('vista-inicio');
    cargarLigas();
}

function volverALiga() {
    if (ligaActual) {
        verLiga(ligaActual.id);
    } else {
        volverInicio();
    }
}

// Cambiar tabs
function cambiarTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activa'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('activa'));
    
    event.target.classList.add('activa');
    document.getElementById(`tab-${tabName}`).classList.add('activa');
    
    // Si se selecciona el tab de pronósticos, generar pronósticos
    if (tabName === 'pronosticos') {
        if (window.pronosticador) {
            generarPronosticos();
        } else {
            console.error('Pronosticador no disponible');
            const container = document.getElementById('pronosticos-container');
            container.innerHTML = `
                <div class="sin-pronosticos">
                    <h4>❌ Error en el sistema de pronósticos</h4>
                    <p>El sistema de pronósticos no se pudo cargar correctamente.<br>
                       Por favor, recarga la página e intenta nuevamente.</p>
                </div>
            `;
        }
    }
}

// Cargar lista de ligas
async function cargarLigas() {
    try {
        const response = await fetch(`${API_URL}/ligas`);
        const ligas = await response.json();
        
        const container = document.getElementById('ligas-container');
        
        if (ligas.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay ligas creadas. ¡Crea tu primera liga!</p></div>';
            return;
        }
        
        container.innerHTML = ligas.map(liga => `
            <div class="liga-card" onclick="verLiga(${liga.id})">
                <h4>🏆 ${liga.nombre}</h4>
                <p>${liga.equipos.length} equipos</p>
                <p>${liga.partidos.length} partidos</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error al cargar ligas:', error);
    }
}

// Crear nueva liga
async function handleCrearLiga(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre-liga').value;
    const numEquipos = parseInt(document.getElementById('num-equipos').value);
    
    try {
        const response = await fetch(`${API_URL}/ligas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, numEquipos })
        });
        
        const liga = await response.json();
        ligaActual = liga;
        
        // Mostrar formulario para editar nombres de equipos
        const equiposInputs = document.getElementById('equipos-inputs');
        equiposInputs.innerHTML = liga.equipos.map(equipo => `
            <div class="equipo-card">
                <div class="equipo-logo-container">
                    <img id="preview-${equipo.id}" class="equipo-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E" alt="Logo" onclick="document.getElementById('foto-${equipo.id}').click()" style="cursor: pointer;" title="Haz clic para cambiar la imagen">
                    <p style="font-size: 0.8em; color: #999; margin-top: 8px; text-align: center;">Haz clic para agregar foto</p>
                    <input type="file" 
                           id="foto-${equipo.id}" 
                           accept="image/*"
                           class="foto-input"
                           onchange="previewFoto(this, ${equipo.id})">
                </div>
                <div class="form-group">
                    <label>Nombre del Equipo:</label>
                    <input type="text" 
                           id="equipo-${equipo.id}" 
                           value="${equipo.nombre}" 
                           required>
                </div>
            </div>
        `).join('');
        
        mostrarVista('vista-editar-equipos');
        document.getElementById('form-crear-liga').reset();
        
    } catch (error) {
        console.error('Error al crear liga:', error);
        alert('Error al crear la liga: ' + error.message);
    }
}

// Previsualizar foto de equipo
function previewFoto(input, equipoId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(`preview-${equipoId}`).src = e.target.result;
            // Guardar en atributo data para obtener después
            input.dataset.base64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Editar nombres de equipos
async function handleEditarEquipos(e) {
    e.preventDefault();
    
    const equiposActualizados = ligaActual.equipos.map(equipo => {
        const fotoInput = document.getElementById(`foto-${equipo.id}`);
        const fotoBase64 = fotoInput.dataset.base64 || equipo.foto || null;
        
        return {
            ...equipo,
            nombre: document.getElementById(`equipo-${equipo.id}`).value,
            foto: fotoBase64
        };
    });
    
    try {
        const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/equipos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipos: equiposActualizados })
        });
        
        const ligaActualizada = await response.json();
        verLiga(ligaActualizada.id);
    } catch (error) {
        console.error('Error al actualizar equipos:', error);
        alert('Error al actualizar los equipos');
    }
}

// Ver detalles de una liga
async function verLiga(ligaId) {
    try {
        const response = await fetch(`${API_URL}/ligas/${ligaId}`);
        const liga = await response.json();
        ligaActual = liga;
        
        document.getElementById('liga-titulo').textContent = liga.nombre;
        
        // Mostrar tabla de posiciones
        mostrarTabla(liga.tabla);
        
        // Cargar selects de equipos para partidos
        cargarSelectsEquipos(liga.equipos);
        
        // Mostrar lista de equipos en el tab
        mostrarEquiposTab(liga.equipos);
        
        // Mostrar lista de partidos
        mostrarPartidos(liga.partidos, liga.equipos);
        
        mostrarVista('vista-liga');
        
        // Activar primera tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activa'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('activa'));
        document.querySelector('.tab-btn').classList.add('activa');
        document.getElementById('tab-tabla').classList.add('activa');
    } catch (error) {
        console.error('Error al cargar liga:', error);
        alert('Error al cargar la liga');
    }
}

// Mostrar tabla de posiciones
function mostrarTabla(tabla) {
    const tbody = document.querySelector('#tabla-posiciones tbody');
    
    if (tabla.length === 0) {
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
        </tr>
    `).join('');
}

// Cargar selects de equipos
function cargarSelectsEquipos(equipos) {
    const selectLocal = document.getElementById('partido-local');
    const selectVisitante = document.getElementById('partido-visitante');
    
    const options = equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    
    selectLocal.innerHTML = options;
    selectVisitante.innerHTML = options;
    
    // Agregar data attribute con foto para referencia
    equipos.forEach(e => {
        selectLocal.dataset[`foto-${e.id}`] = e.foto || null;
        selectVisitante.dataset[`foto-${e.id}`] = e.foto || null;
    });
}

// Mostrar equipos en el tab
function mostrarEquiposTab(equipos) {
    const container = document.getElementById('equipos-lista-tab');
    
    container.innerHTML = equipos.map(equipo => {
        const foto = equipo.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E`;
        
        return `
            <div class="equipo-card-tab" onclick="editarEquipo(${equipo.id})">
                <img class="equipo-card-tab-logo" src="${foto}" alt="${equipo.nombre}">
                <div class="equipo-card-tab-nombre">${equipo.nombre}</div>
            </div>
        `;
    }).join('');
}

// Editar equipo individual
function editarEquipo(equipoId) {
    const equipo = ligaActual.equipos.find(e => e.id === equipoId);
    if (!equipo) {
        alert('Equipo no encontrado');
        return;
    }
    
    const foto = equipo.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${equipo.id}%3C/text%3E%3C/svg%3E`;
    
    document.getElementById('editar-equipo-titulo').textContent = `Editar: ${equipo.nombre}`;
    document.getElementById('editar-equipo-preview').src = foto;
    document.getElementById('editar-equipo-nombre').value = equipo.nombre;
    
    // Guardar referencia del equipo actual
    window.equipoActual = equipo;
    
    // Mostrar/ocultar botón de eliminar foto
    const btnEliminarFoto = document.getElementById('btn-eliminar-foto');
    if (equipo.foto) {
        btnEliminarFoto.style.display = 'block';
    } else {
        btnEliminarFoto.style.display = 'none';
    }
    
    // Limpiar input de archivo
    document.getElementById('editar-equipo-foto-input').value = '';
    
    mostrarVista('vista-editar-equipo');
}

// Vista previa de foto del equipo
function previewFotoEquipo(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editar-equipo-preview').src = e.target.result;
            document.getElementById('btn-eliminar-foto').style.display = 'block';
            // Guardar en atributo data para obtener después
            input.dataset.base64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Eliminar foto del equipo
function eliminarFotoEquipo() {
    document.getElementById('editar-equipo-preview').src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${window.equipoActual.id}%3C/text%3E%3C/svg%3E`;
    document.getElementById('btn-eliminar-foto').style.display = 'none';
    document.getElementById('editar-equipo-foto-input').value = '';
    document.getElementById('editar-equipo-foto-input').dataset.base64 = null;
}

// Guardar cambios del equipo
async function guardarCambiosEquipo(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('editar-equipo-nombre').value;
    const fotoInput = document.getElementById('editar-equipo-foto-input');
    const fotoBase64 = fotoInput.dataset.base64 || window.equipoActual.foto || null;
    
    // Actualizar equipo en ligaActual
    window.equipoActual.nombre = nombre;
    window.equipoActual.foto = fotoBase64;
    
    try {
        const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/equipos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipos: ligaActual.equipos })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Error al guardar los cambios');
            return;
        }
        
        ligaActual = data;
        alert('Cambios guardados exitosamente');
        verLiga(ligaActual.id);
    } catch (error) {
        console.error('Error al guardar cambios del equipo:', error);
        alert('Error al guardar los cambios');
    }
}

// Actualizar vista previa del partido a agregar

function actualizarPreviewPartidos() {
    const localId = parseInt(document.getElementById('partido-local').value);
    const visitanteId = parseInt(document.getElementById('partido-visitante').value);
    const previewContainer = document.getElementById('preview-partido');
    
    if (!localId || !visitanteId || localId === visitanteId) {
        previewContainer.style.display = 'none';
        return;
    }
    
    const local = ligaActual.equipos.find(e => e.id === localId);
    const visitante = ligaActual.equipos.find(e => e.id === visitanteId);
    
    if (local && visitante) {
        const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
        const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;
        
        document.getElementById('preview-logo-local').src = fotoLocal;
        document.getElementById('preview-nombre-local').textContent = local.nombre;
        document.getElementById('preview-logo-visitante').src = fotoVisitante;
        document.getElementById('preview-nombre-visitante').textContent = visitante.nombre;
        
        previewContainer.style.display = 'block';
    }
}

// Agregar partido
async function handleAgregarPartido(e) {
    e.preventDefault();
    
    const localId = parseInt(document.getElementById('partido-local').value);
    const visitanteId = parseInt(document.getElementById('partido-visitante').value);
    const jornada = parseInt(document.getElementById('partido-jornada').value);
    
    if (localId === visitanteId) {
        alert('Un equipo no puede jugar contra sí mismo');
        return;
    }
    
    // Validar que los mismos equipos no se enfrenten en la misma jornada
    const partidoExistente = ligaActual.partidos.find(p => 
        p.jornada === jornada && 
        (
            (p.localId === localId && p.visitanteId === visitanteId) ||
            (p.localId === visitanteId && p.visitanteId === localId)
        )
    );
    
    if (partidoExistente) {
        alert('Estos equipos ya se enfrentan en esta jornada');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/ligas/${ligaActual.id}/partidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localId, visitanteId, jornada })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Error al agregar el partido');
            return;
        }
        
        verLiga(ligaActual.id);
        document.getElementById('form-agregar-partido').reset();
    } catch (error) {
        console.error('Error al agregar partido:', error);
        alert('Error al agregar el partido');
    }
}

// Mostrar lista de partidos
function mostrarPartidos(partidos, equipos) {
    const container = document.getElementById('partidos-lista');
    
    if (partidos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay partidos programados</p></div>';
        return;
    }
    
    // Agrupar por jornada
    const partidosPorJornada = {};
    partidos.forEach(partido => {
        if (!partidosPorJornada[partido.jornada]) {
            partidosPorJornada[partido.jornada] = [];
        }
        partidosPorJornada[partido.jornada].push(partido);
    });
    
    container.innerHTML = Object.entries(partidosPorJornada)
        .sort(([a], [b]) => a - b)
        .map(([jornada, partidosJornada]) => `
            <h4 style="margin-top: 20px; color: #667eea;">Jornada ${jornada}</h4>
            ${partidosJornada.map(partido => {
                const local = equipos.find(e => e.id === partido.localId);
                const visitante = equipos.find(e => e.id === partido.visitanteId);
                const tieneEstadisticas = partido.estadisticas ? '<span class="stats-badge">📊 Stats</span>' : '';
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
                            ${tieneEstadisticas}
                        </div>
                        ${partido.jugado ? `
                            <div class="resultado-final">
                                ${partido.golesLocal} - ${partido.golesVisitante}
                                <button onclick="event.stopPropagation(); editarPartido(${partido.id})" class="btn-editar">✏️ Editar</button>
                            </div>
                        ` : '<p style="color: #999; margin-top: 5px;">Pendiente - Click para agregar detalles</p>'}
                    </div>
                `;
            }).join('')}
        `).join('');
}

// Mostrar partidos pendientes para registrar resultados
function mostrarPartidosPendientes(partidos, equipos) {
    const container = document.getElementById('partidos-pendientes');
    
    const pendientes = partidos.filter(p => !p.jugado);
    
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
                    <input type="number" 
                           id="goles-local-${partido.id}" 
                           min="0" 
                           placeholder="${local.nombre}" 
                           required>
                    <span style="font-weight: bold;">-</span>
                    <input type="number" 
                           id="goles-visitante-${partido.id}" 
                           min="0" 
                           placeholder="${visitante.nombre}" 
                           required>
                    <button type="submit" class="btn btn-success">Guardar</button>
                </form>
            </div>
        `;
    }).join('');
}

// Generar y mostrar pronósticos
async function generarPronosticos() {
    const container = document.getElementById('pronosticos-container');
    
    try {
        // Mostrar loading
        container.innerHTML = `
            <div id="pronosticos-loading" style="text-align: center; color: #666; padding: 20px;">
                <p>🔮 Analizando estadísticas y generando pronósticos...</p>
            </div>
        `;
        
        // Obtener todas las ligas
        const response = await fetch(`${API_URL}/ligas`);
        const todasLasLigas = await response.json();
        
        // Obtener detalles completos de cada liga
        const ligasCompletas = [];
        for (const liga of todasLasLigas) {
            const detalleResponse = await fetch(`${API_URL}/ligas/${liga.id}`);
            const ligaDetalle = await detalleResponse.json();
            ligasCompletas.push(ligaDetalle);
        }
        
        // Generar pronósticos
        const pronosticos = window.pronosticador.generarPronosticosGlobales(ligasCompletas);
        pronosticosGlobales = pronosticos; // Almacenar para acceso en vista detallada
        
        // Mostrar pronósticos
        mostrarPronosticos(pronosticos);
        
    } catch (error) {
        console.error('Error al generar pronósticos:', error);
        container.innerHTML = `
            <div class="sin-pronosticos">
                <h4>❌ Error al generar pronósticos</h4>
                <p>No se pudieron cargar los datos necesarios. Intenta nuevamente.</p>
            </div>
        `;
    }
}

// Mostrar pronósticos en la interfaz
function mostrarPronosticos(pronosticos) {
    const container = document.getElementById('pronosticos-container');
    
    if (pronosticos.length === 0) {
        container.innerHTML = `
            <div class="sin-pronosticos">
                <h4>📅 No hay partidos pendientes</h4>
                <p>No se encontraron partidos pendientes para generar pronósticos.<br>
                   Agrega algunos partidos en el tab "Partidos" para ver pronósticos aquí.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pronosticos.map(ligaPronostico => `
        <div class="pronosticos-liga">
            <h4>🏆 ${ligaPronostico.liga}</h4>
            ${ligaPronostico.partidos.map(pronostico => generarHTMLPronostico(pronostico)).join('')}
        </div>
    `).join('');
}

// Generar HTML para un pronóstico individual (vista resumida)
function generarHTMLPronostico(pronostico) {
    const local = pronostico.equipoLocal;
    const visitante = pronostico.equipoVisitante;
    const prob = pronostico.probabilidades;
    
    // Determinar resultado más probable
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
                <div class="probabilidad-item ${prob.local > prob.empate && prob.local > prob.visitante ? 'ganador' : ''}">
                    <h5>${local.nombre}</h5>
                    <div class="probabilidad-porcentaje">${prob.local}%</div>
                </div>
                <div class="probabilidad-item ${prob.empate > prob.local && prob.empate > prob.visitante ? 'ganador' : ''}">
                    <h5>Empate</h5>
                    <div class="probabilidad-porcentaje">${prob.empate}%</div>
                </div>
                <div class="probabilidad-item ${prob.visitante > prob.empate && prob.visitante > prob.local ? 'ganador' : ''}">
                    <h5>${visitante.nombre}</h5>
                    <div class="probabilidad-porcentaje">${prob.visitante}%</div>
                </div>
            </div>
            
            <div class="pronostico-resumen">
                <div class="goles-esperados">
                    <span>${local.estadisticas.golesEsperados} - ${visitante.estadisticas.golesEsperados}</span>
                    <small>Goles esperados</small>
                </div>
                <div class="click-hint">
                    👆 Haz clic para ver análisis completo
                </div>
            </div>
        </div>
    `;
}

// Ver detalle del pronóstico
function verDetallePronostico(ligaNombre, partidoId) {
    // Buscar el pronóstico en los datos globales
    let pronosticoDetallado = null;
    
    for (const ligaPronostico of pronosticosGlobales) {
        if (ligaPronostico.liga === ligaNombre) {
            pronosticoDetallado = ligaPronostico.partidos.find(p => p.partidoId === partidoId);
            if (pronosticoDetallado) break;
        }
    }
    
    if (!pronosticoDetallado) {
        alert('No se pudo cargar el detalle del pronóstico');
        return;
    }
    
    // Configurar la vista de detalle
    const titulo = document.getElementById('detalle-pronostico-titulo');
    titulo.textContent = `🔮 Pronóstico Detallado: ${pronosticoDetallado.equipoLocal.nombre} vs ${pronosticoDetallado.equipoVisitante.nombre}`;
    
    // Generar el HTML del detalle completo
    const contenido = document.getElementById('detalle-pronostico-contenido');
    contenido.innerHTML = generarHTMLPronosticoDetallado(pronosticoDetallado);
    
    // Mostrar la vista
    mostrarVista('vista-detalle-pronostico');
}

// Generar HTML detallado del pronóstico
function generarHTMLPronosticoDetallado(pronostico) {
    const local = pronostico.equipoLocal;
    const visitante = pronostico.equipoVisitante;
    const prob = pronostico.probabilidades;
    
    const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E`;
    const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EV%3C/text%3E%3C/svg%3E`;
    
    return `
        <div class="pronostico-detallado">
            <div class="pronostico-header-detallado">
                <div class="equipos-enfrentamiento">
                    <div class="equipo-detallado">
                        <img src="${fotoLocal}" alt="${local.nombre}" class="equipo-detallado-logo">
                        <h3>${local.nombre}</h3>
                        <span class="condicion-juego">Local</span>
                    </div>
                    <div class="vs-detallado">VS</div>
                    <div class="equipo-detallado">
                        <img src="${fotoVisitante}" alt="${visitante.nombre}" class="equipo-detallado-logo">
                        <h3>${visitante.nombre}</h3>
                        <span class="condicion-juego">Visitante</span>
                    </div>
                </div>
                <div class="jornada-info">
                    <span class="jornada-badge-detallado">Jornada ${pronostico.jornada}</span>
                </div>
            </div>
            
            <div class="resultado-esperado">
                <h4>🎯 Resultado Esperado</h4>
                <div class="marcador-esperado">
                    <span class="gol-local">${local.estadisticas.golesEsperados}</span>
                    <span class="separador">-</span>
                    <span class="gol-visitante">${visitante.estadisticas.golesEsperados}</span>
                </div>
            </div>
            
            <div class="probabilidades-detalladas">
                <h4>📊 Probabilidades de Resultado</h4>
                <div class="probabilidades-grid">
                    <div class="probabilidad-detallada ${prob.local > prob.empate && prob.local > prob.visitante ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <img src="${fotoLocal}" alt="${local.nombre}">
                            <span>${local.nombre}</span>
                        </div>
                        <div class="probabilidad-numero">${prob.local}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.local}%"></div>
                        </div>
                    </div>
                    <div class="probabilidad-detallada ${prob.empate > prob.local && prob.empate > prob.visitante ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <span>⚖️ Empate</span>
                        </div>
                        <div class="probabilidad-numero">${prob.empate}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.empate}%"></div>
                        </div>
                    </div>
                    <div class="probabilidad-detallada ${prob.visitante > prob.empate && prob.visitante > prob.local ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <img src="${fotoVisitante}" alt="${visitante.nombre}">
                            <span>${visitante.nombre}</span>
                        </div>
                        <div class="probabilidad-numero">${prob.visitante}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.visitante}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="estadisticas-comparativas">
                <h4>📈 Análisis Estadístico Completo</h4>
                <div class="comparacion-equipos">
                    <div class="equipo-stats">
                        <h5>
                            <img src="${fotoLocal}" alt="${local.nombre}">
                            ${local.nombre}
                            <span class="partidos-analizados">Basado en ${local.estadisticas.partidosAnalizados} partidos</span>
                        </h5>
                        <div class="stats-lista">
                            <div class="stat-item">
                                <span class="stat-label">⚽ Goles esperados:</span>
                                <span class="stat-valor">${local.estadisticas.golesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates:</span>
                                <span class="stat-valor">${local.estadisticas.rematesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates al arco:</span>
                                <span class="stat-valor">${local.estadisticas.rematesArcoEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Posesión:</span>
                                <span class="stat-valor">${local.estadisticas.posesionEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Pases:</span>
                                <span class="stat-valor">${local.estadisticas.pasesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Precisión pases:</span>
                                <span class="stat-valor">${local.estadisticas.precisionPasesEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚠️ Faltas:</span>
                                <span class="stat-valor">${local.estadisticas.faltasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟨 Tarjetas amarillas:</span>
                                <span class="stat-valor">${local.estadisticas.amarillasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟥 Tarjetas rojas:</span>
                                <span class="stat-valor">${local.estadisticas.rojasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚫 Fueras de lugar:</span>
                                <span class="stat-valor">${local.estadisticas.fueraLugarEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚩 Corners:</span>
                                <span class="stat-valor">${local.estadisticas.cornersEsperados}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="equipo-stats">
                        <h5>
                            <img src="${fotoVisitante}" alt="${visitante.nombre}">
                            ${visitante.nombre}
                            <span class="partidos-analizados">Basado en ${visitante.estadisticas.partidosAnalizados} partidos</span>
                        </h5>
                        <div class="stats-lista">
                            <div class="stat-item">
                                <span class="stat-label">⚽ Goles esperados:</span>
                                <span class="stat-valor">${visitante.estadisticas.golesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates:</span>
                                <span class="stat-valor">${visitante.estadisticas.rematesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates al arco:</span>
                                <span class="stat-valor">${visitante.estadisticas.rematesArcoEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Posesión:</span>
                                <span class="stat-valor">${visitante.estadisticas.posesionEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Pases:</span>
                                <span class="stat-valor">${visitante.estadisticas.pasesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Precisión pases:</span>
                                <span class="stat-valor">${visitante.estadisticas.precisionPasesEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚠️ Faltas:</span>
                                <span class="stat-valor">${visitante.estadisticas.faltasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟨 Tarjetas amarillas:</span>
                                <span class="stat-valor">${visitante.estadisticas.amarillasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟥 Tarjetas rojas:</span>
                                <span class="stat-valor">${visitante.estadisticas.rojasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚫 Fueras de lugar:</span>
                                <span class="stat-valor">${visitante.estadisticas.fueraLugarEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚩 Corners:</span>
                                <span class="stat-valor">${visitante.estadisticas.cornersEsperados}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mercados-apuestas">
                <h4>💰 Mercados de Apuestas</h4>
                ${generarHTMLMercadosApuestas(pronostico.mercadosApuestas)}
            </div>
            
            <div class="metodologia">
                <h4>🔬 Metodología del Pronóstico</h4>
                <div class="metodologia-info">
                    <p><strong>Análisis basado en:</strong> Últimos 10 partidos de cada equipo</p>
                    <p><strong>Factores considerados:</strong> Ventaja de local (+15%), desventaja de visitante (-5%)</p>
                    <p><strong>Variables analizadas:</strong> Goles, remates, posesión, pases, faltas, tarjetas, corners</p>
                    <p><strong>Algoritmo:</strong> Promedio ponderado con factores de rendimiento local/visitante</p>
                </div>
            </div>
        </div>
    `;
}

// Generar HTML para los mercados de apuestas
function generarHTMLMercadosApuestas(mercados) {
    const buildOverUnderRows = (items, label) => {
        return items.map(m => {
            const menosProb = Math.round(m.menos * 100);
            const masProb = Math.round(m.mas * 100);
            const masGanador = masProb >= menosProb;
            return `
                <div class="mercado-opciones">
                    <div class="opcion-mercado ${!masGanador ? 'ganador' : ''}">
                        <span class="opcion-label">-${m.linea} ${label}</span>
                        <span class="opcion-probabilidad">${menosProb}%</span>
                    </div>
                    <div class="opcion-mercado ${masGanador ? 'ganador' : ''}">
                        <span class="opcion-label">+${m.linea} ${label}</span>
                        <span class="opcion-probabilidad">${masProb}%</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    const sections = [];

    if (mercados.golesTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>⚽ Goles Totales</h5>
                ${buildOverUnderRows(mercados.golesTotales, 'goles')}
            </div>
        `);
    }
    if (mercados.rematesTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>🎯 Remates Totales</h5>
                ${buildOverUnderRows(mercados.rematesTotales, 'remates')}
            </div>
        `);
    }
    if (mercados.rematesArcoTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>🎯 Remates al Arco</h5>
                ${buildOverUnderRows(mercados.rematesArcoTotales, 'remates al arco')}
            </div>
        `);
    }
    if (mercados.pasesTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>📋 Pases Totales</h5>
                ${buildOverUnderRows(mercados.pasesTotales, 'pases')}
            </div>
        `);
    }
    if (mercados.faltasTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>⚠️ Faltas Totales</h5>
                ${buildOverUnderRows(mercados.faltasTotales, 'faltas')}
            </div>
        `);
    }
    if (mercados.amarillasTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>🟨 Tarjetas Amarillas</h5>
                ${buildOverUnderRows(mercados.amarillasTotales, 'tarjetas')}</div>
        `);
    }
    if (mercados.fueraLugarTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>🚫 Fuera de Lugar</h5>
                ${buildOverUnderRows(mercados.fueraLugarTotales, 'fuera de lugar')}
            </div>
        `);
    }
    if (mercados.cornersTotales) {
        sections.push(`
            <div class="mercado-section">
                <h5>🚩 Corners Totales</h5>
                ${buildOverUnderRows(mercados.cornersTotales, 'corners')}
            </div>
        `);
    }

    // Ambos Marcan y Tarjeta Roja
    if (mercados.ambosMarcan) {
        sections.push(`
            <div class="mercado-section">
                <h5>⚽ Ambos Marcan</h5>
                <div class="mercado-opciones">
                    <div class="opcion-mercado ${mercados.ambosMarcan.primerTiempo.si > mercados.ambosMarcan.primerTiempo.no ? 'ganador' : ''}">
                        <span class="opcion-label">Sí (1er Tiempo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.primerTiempo.si}%</span>
                    </div>
                    <div class="opcion-mercado ${mercados.ambosMarcan.primerTiempo.no >= mercados.ambosMarcan.primerTiempo.si ? 'ganador' : ''}">
                        <span class="opcion-label">No (1er Tiempo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.primerTiempo.no}%</span>
                    </div>
                </div>
                <div class="mercado-opciones">
                    <div class="opcion-mercado ${mercados.ambosMarcan.segundoTiempo.si > mercados.ambosMarcan.segundoTiempo.no ? 'ganador' : ''}">
                        <span class="opcion-label">Sí (2do Tiempo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.segundoTiempo.si}%</span>
                    </div>
                    <div class="opcion-mercado ${mercados.ambosMarcan.segundoTiempo.no >= mercados.ambosMarcan.segundoTiempo.si ? 'ganador' : ''}">
                        <span class="opcion-label">No (2do Tiempo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.segundoTiempo.no}%</span>
                    </div>
                </div>
                <div class="mercado-opciones">
                    <div class="opcion-mercado ${mercados.ambosMarcan.partidoCompleto.si > mercados.ambosMarcan.partidoCompleto.no ? 'ganador' : ''}">
                        <span class="opcion-label">Sí (Partido Completo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.partidoCompleto.si}%</span>
                    </div>
                    <div class="opcion-mercado ${mercados.ambosMarcan.partidoCompleto.no >= mercados.ambosMarcan.partidoCompleto.si ? 'ganador' : ''}">
                        <span class="opcion-label">No (Partido Completo)</span>
                        <span class="opcion-probabilidad">${mercados.ambosMarcan.partidoCompleto.no}%</span>
                    </div>
                </div>
            </div>
        `);
    }

    if (mercados.roja !== undefined) {
        sections.push(`
            <div class="mercado-section">
                <h5>🟥 Tarjeta Roja</h5>
                <div class="mercado-opciones">
                    <div class="opcion-mercado ganador">
                        <span class="opcion-label">Tarjeta Roja (Probabilidad)</span>
                        <span class="opcion-probabilidad">${mercados.roja}%</span>
                    </div>
                </div>
            </div>
        `);
    }

    return `
        <div class="mercados-container">
            ${sections.join('')}
        </div>
    `;
}

// Registrar resultado de partido
async function registrarResultado(e, partidoId) {
    e.preventDefault();
    
    const golesLocal = parseInt(document.getElementById(`goles-local-${partidoId}`).value);
    const golesVisitante = parseInt(document.getElementById(`goles-visitante-${partidoId}`).value);
    
    try {
        const response = await fetch(`${API_URL}/partidos/${partidoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ golesLocal, golesVisitante })
        });
        
        await response.json();
        verLiga(ligaActual.id);
    } catch (error) {
        console.error('Error al registrar resultado:', error);
        alert('Error al registrar el resultado');
    }
}

// Ver detalle del partido con estadísticas
async function verDetallePartido(partidoId) {
    // Si ligaActual no está cargado, no podemos continuar
    if (!ligaActual) {
        alert('Por favor, selecciona una liga primero');
        return;
    }
    
    const partido = ligaActual.partidos.find(p => p.id === partidoId);
    if (!partido) {
        alert('No se encontró el partido');
        return;
    }
    
    partidoActual = partido;
    
    const local = ligaActual.equipos.find(e => e.id === partido.localId);
    const visitante = ligaActual.equipos.find(e => e.id === partido.visitanteId);
    
    document.getElementById('detalle-partido-titulo').textContent = 
        `${local.nombre} vs ${visitante.nombre} - Jornada ${partido.jornada}`;
    
    const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${local.id}%3C/text%3E%3C/svg%3E`;
    const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3E${visitante.id}%3C/text%3E%3C/svg%3E`;
    
    // Actualizar imágenes de los equipos en el encabezado
    document.getElementById('titulo-stats-local').innerHTML = `<img class="detalle-equipo-logo" src="${fotoLocal}" alt="${local.nombre}" title="${local.nombre}"> ${local.nombre}`;
    document.getElementById('titulo-stats-visitante').innerHTML = `<img class="detalle-equipo-logo" src="${fotoVisitante}" alt="${visitante.nombre}" title="${visitante.nombre}"> ${visitante.nombre}`;
    
    if (partido.estadisticas) {
        const stats = partido.estadisticas;
        
        // Cargar estadísticas del equipo local
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
        
        // Cargar estadísticas del equipo visitante
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
        // Resetear formulario
        document.querySelectorAll('#form-detalle-partido input[type="number"]').forEach(input => {
            if (input.id.includes('posesion')) {
                input.value = 0;
            } else {
                input.value = 0;
            }
        });
    }
    
    mostrarVista('vista-detalle-partido');
    
    // Configurar event listeners para cálculos automáticos
    configurarCalculosAutomaticos();
}

/**
 * Configura event listeners para calcular automáticamente:
 * - Goles totales (suma de goles 1er + 2do tiempo)
 * - Posesión del equipo visitante (100 - posesión local)
 */
function configurarCalculosAutomaticos() {
    // Elementos de goles del equipo local
    const localGolesPrimero = document.getElementById('local-goles-primero');
    const localGolesSegundo = document.getElementById('local-goles-segundo');
    const localGolesDisplay = document.getElementById('goles-local-display');
    
    // Elementos de goles del equipo visitante
    const visitanteGolesPrimero = document.getElementById('visitante-goles-primero');
    const visitanteGolesSegundo = document.getElementById('visitante-goles-segundo');
    const visitanteGolesDisplay = document.getElementById('goles-visitante-display');
    
    // Elementos de posesión
    const localPosesion = document.getElementById('local-posesion');
    const visitantePosesion = document.getElementById('visitante-posesion');
    
    // Función para calcular goles locales
    const calcularGolesLocal = () => {
        const primero = parseInt(localGolesPrimero.value) || 0;
        const segundo = parseInt(localGolesSegundo.value) || 0;
        const total = primero + segundo;
        localGolesDisplay.textContent = total;
    };
    
    // Función para calcular goles visitante
    const calcularGolesVisitante = () => {
        const primero = parseInt(visitanteGolesPrimero.value) || 0;
        const segundo = parseInt(visitanteGolesSegundo.value) || 0;
        const total = primero + segundo;
        visitanteGolesDisplay.textContent = total;
    };
    
    // Función para calcular posesión automática
    const calcularPosesionAutomatica = () => {
        const posesionLocal = parseFloat(localPosesion.value) || 0;
        const posesionVisitante = Math.max(0, Math.min(100, 100 - posesionLocal));
        visitantePosesion.value = posesionVisitante;
    };
    
    // Agregar event listeners para goles locales
    localGolesPrimero.addEventListener('change', calcularGolesLocal);
    localGolesSegundo.addEventListener('change', calcularGolesLocal);
    localGolesPrimero.addEventListener('input', calcularGolesLocal);
    localGolesSegundo.addEventListener('input', calcularGolesLocal);
    
    // Agregar event listeners para goles visitante
    visitanteGolesPrimero.addEventListener('change', calcularGolesVisitante);
    visitanteGolesSegundo.addEventListener('change', calcularGolesVisitante);
    visitanteGolesPrimero.addEventListener('input', calcularGolesVisitante);
    visitanteGolesSegundo.addEventListener('input', calcularGolesVisitante);
    
    // Agregar event listener para posesión automática
    localPosesion.addEventListener('change', calcularPosesionAutomatica);
    localPosesion.addEventListener('input', calcularPosesionAutomatica);
    
    // Calcular valores iniciales
    calcularGolesLocal();
    calcularGolesVisitante();
    calcularPosesionAutomatica();
}

// Editar partido existente
function editarPartido(partidoId) {
    verDetallePartido(partidoId);
}

// Ver detalle del pronóstico
function verDetallePronostico(ligaNombre, partidoId) {
    // Buscar el pronóstico en los datos globales
    let pronosticoDetallado = null;
    
    for (const ligaPronostico of pronosticosGlobales) {
        if (ligaPronostico.liga === ligaNombre) {
            pronosticoDetallado = ligaPronostico.partidos.find(p => p.partidoId === partidoId);
            if (pronosticoDetallado) break;
        }
    }
    
    if (!pronosticoDetallado) {
        alert('No se pudo cargar el detalle del pronóstico');
        return;
    }
    
    // Configurar la vista de detalle
    const titulo = document.getElementById('detalle-pronostico-titulo');
    titulo.textContent = `🔮 Pronóstico Detallado: ${pronosticoDetallado.equipoLocal.nombre} vs ${pronosticoDetallado.equipoVisitante.nombre}`;
    
    // Generar el HTML del detalle completo
    const contenido = document.getElementById('detalle-pronostico-contenido');
    contenido.innerHTML = generarHTMLPronosticoDetallado(pronosticoDetallado);
    
    // Mostrar la vista
    mostrarVista('vista-detalle-pronostico');
}

// Generar HTML detallado del pronóstico
function generarHTMLPronosticoDetallado(pronostico) {
    const local = pronostico.equipoLocal;
    const visitante = pronostico.equipoVisitante;
    const prob = pronostico.probabilidades;
    
    const fotoLocal = local.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23667eea' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EL%3C/text%3E%3C/svg%3E`;
    const fotoVisitante = visitante.foto || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23764ba2' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-weight='bold'%3EV%3C/text%3E%3C/svg%3E`;
    
    return `
        <div class="pronostico-detallado">
            <div class="pronostico-header-detallado">
                <div class="equipos-enfrentamiento">
                    <div class="equipo-detallado">
                        <img src="${fotoLocal}" alt="${local.nombre}" class="equipo-detallado-logo">
                        <h3>${local.nombre}</h3>
                        <span class="condicion-juego">Local</span>
                    </div>
                    <div class="vs-detallado">VS</div>
                    <div class="equipo-detallado">
                        <img src="${fotoVisitante}" alt="${visitante.nombre}" class="equipo-detallado-logo">
                        <h3>${visitante.nombre}</h3>
                        <span class="condicion-juego">Visitante</span>
                    </div>
                </div>
                <div class="jornada-info">
                    <span class="jornada-badge-detallado">Jornada ${pronostico.jornada}</span>
                </div>
            </div>
            
            <div class="resultado-esperado">
                <h4>🎯 Resultado Esperado</h4>
                <div class="marcador-esperado">
                    <span class="gol-local">${local.estadisticas.golesEsperados}</span>
                    <span class="separador">-</span>
                    <span class="gol-visitante">${visitante.estadisticas.golesEsperados}</span>
                </div>
            </div>
            
            <div class="probabilidades-detalladas">
                <h4>📊 Probabilidades de Resultado</h4>
                <div class="probabilidades-grid">
                    <div class="probabilidad-detallada ${prob.local > prob.empate && prob.local > prob.visitante ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <img src="${fotoLocal}" alt="${local.nombre}">
                            <span>${local.nombre}</span>
                        </div>
                        <div class="probabilidad-numero">${prob.local}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.local}%"></div>
                        </div>
                    </div>
                    <div class="probabilidad-detallada ${prob.empate > prob.local && prob.empate > prob.visitante ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <span>⚖️ Empate</span>
                        </div>
                        <div class="probabilidad-numero">${prob.empate}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.empate}%"></div>
                        </div>
                    </div>
                    <div class="probabilidad-detallada ${prob.visitante > prob.empate && prob.visitante > prob.local ? 'mas-probable' : ''}">
                        <div class="probabilidad-equipo">
                            <img src="${fotoVisitante}" alt="${visitante.nombre}">
                            <span>${visitante.nombre}</span>
                        </div>
                        <div class="probabilidad-numero">${prob.visitante}%</div>
                        <div class="probabilidad-barra">
                            <div class="barra-fill" style="width: ${prob.visitante}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="estadisticas-comparativas">
                <h4>📈 Análisis Estadístico Completo</h4>
                <div class="comparacion-equipos">
                    <div class="equipo-stats">
                        <h5>
                            <img src="${fotoLocal}" alt="${local.nombre}">
                            ${local.nombre}
                            <span class="partidos-analizados">Basado en ${local.estadisticas.partidosAnalizados} partidos</span>
                        </h5>
                        <div class="stats-lista">
                            <div class="stat-item">
                                <span class="stat-label">⚽ Goles esperados:</span>
                                <span class="stat-valor">${local.estadisticas.golesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates:</span>
                                <span class="stat-valor">${local.estadisticas.rematesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates al arco:</span>
                                <span class="stat-valor">${local.estadisticas.rematesArcoEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Posesión:</span>
                                <span class="stat-valor">${local.estadisticas.posesionEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Pases:</span>
                                <span class="stat-valor">${local.estadisticas.pasesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Precisión pases:</span>
                                <span class="stat-valor">${local.estadisticas.precisionPasesEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚠️ Faltas:</span>
                                <span class="stat-valor">${local.estadisticas.faltasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟨 Tarjetas amarillas:</span>
                                <span class="stat-valor">${local.estadisticas.amarillasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟥 Tarjetas rojas:</span>
                                <span class="stat-valor">${local.estadisticas.rojasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚫 Fueras de lugar:</span>
                                <span class="stat-valor">${local.estadisticas.fueraLugarEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚩 Corners:</span>
                                <span class="stat-valor">${local.estadisticas.cornersEsperados}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="equipo-stats">
                        <h5>
                            <img src="${fotoVisitante}" alt="${visitante.nombre}">
                            ${visitante.nombre}
                            <span class="partidos-analizados">Basado en ${visitante.estadisticas.partidosAnalizados} partidos</span>
                        </h5>
                        <div class="stats-lista">
                            <div class="stat-item">
                                <span class="stat-label">⚽ Goles esperados:</span>
                                <span class="stat-valor">${visitante.estadisticas.golesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates:</span>
                                <span class="stat-valor">${visitante.estadisticas.rematesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Remates al arco:</span>
                                <span class="stat-valor">${visitante.estadisticas.rematesArcoEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Posesión:</span>
                                <span class="stat-valor">${visitante.estadisticas.posesionEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚽ Pases:</span>
                                <span class="stat-valor">${visitante.estadisticas.pasesEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🎯 Precisión pases:</span>
                                <span class="stat-valor">${visitante.estadisticas.precisionPasesEsperada}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">⚠️ Faltas:</span>
                                <span class="stat-valor">${visitante.estadisticas.faltasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟨 Tarjetas amarillas:</span>
                                <span class="stat-valor">${visitante.estadisticas.amarillasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🟥 Tarjetas rojas:</span>
                                <span class="stat-valor">${visitante.estadisticas.rojasEsperadas}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚫 Fueras de lugar:</span>
                                <span class="stat-valor">${visitante.estadisticas.fueraLugarEsperados}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">🚩 Corners:</span>
                                <span class="stat-valor">${visitante.estadisticas.cornersEsperados}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="metodologia">
                <h4>🔬 Metodología del Pronóstico</h4>
                <div class="metodologia-info">
                    <p><strong>Análisis basado en:</strong> Últimos 10 partidos de cada equipo</p>
                    <p><strong>Factores considerados:</strong> Ventaja de local (+15%), desventaja de visitante (-5%)</p>
                    <p><strong>Variables analizadas:</strong> Goles, remates, posesión, pases, faltas, tarjetas, corners</p>
                    <p><strong>Algoritmo:</strong> Promedio ponderado con factores de rendimiento local/visitante</p>
                </div>
            </div>
        </div>
    `;
}

// Guardar detalle del partido con estadísticas
async function handleGuardarDetallePartido(e) {
    e.preventDefault();
    
    // Obtener goles del display (elementos de texto, no inputs)
    const golesLocal = parseInt(document.getElementById('goles-local-display').textContent) || 0;
    const golesVisitante = parseInt(document.getElementById('goles-visitante-display').textContent) || 0;
    
    // Recopilar goles por tiempo
    const golesPorTiempo = {
        localPrimero: parseInt(document.getElementById('local-goles-primero').value) || 0,
        localSegundo: parseInt(document.getElementById('local-goles-segundo').value) || 0,
        visitantePrimero: parseInt(document.getElementById('visitante-goles-primero').value) || 0,
        visitanteSegundo: parseInt(document.getElementById('visitante-goles-segundo').value) || 0
    };
    
    // Validar que los goles por tiempo sumen correctamente
    const totalLocalTiempos = golesPorTiempo.localPrimero + golesPorTiempo.localSegundo;
    const totalVisitanteTiempos = golesPorTiempo.visitantePrimero + golesPorTiempo.visitanteSegundo;
    
    if (totalLocalTiempos !== golesLocal || totalVisitanteTiempos !== golesVisitante) {
        alert('Los goles por tiempo deben sumar el total de goles del equipo');
        return;
    }
    
    const estadisticas = {
        local: {
            // Usar parseFloat para manejar decimales
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
            // Usar parseFloat para manejar decimales
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
        const response = await fetch(`${API_URL}/partidos/${partidoActual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                golesLocal, 
                golesVisitante,
                golesPorTiempo, // Agregar goles por tiempo
                estadisticas 
            })
        });
        
        await response.json();
        verLiga(ligaActual.id);
    } catch (error) {
        console.error('Error al guardar detalles del partido:', error);
        alert('Error al guardar los detalles del partido');
    }
}