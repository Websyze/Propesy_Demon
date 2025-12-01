// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// Base de datos en memoria
let ligas = [];
let ligaIdCounter = 1;
let partidoIdCounter = 1;

const PORT = 3000;

// Tipos MIME
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

// Función para servir archivos estáticos
function serveStaticFile(res, filePath) {
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Archivo no encontrado</h1>');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Calcular tabla de posiciones
function calcularTabla(equipos, partidos) {
  const tabla = equipos.map(e => ({
    ...e,
    pj: 0, pg: 0, pe: 0, pp: 0,
    gf: 0, gc: 0, dg: 0, pts: 0
  }));

  partidos.filter(p => p.jugado).forEach(partido => {
    const local = tabla.find(e => e.id === partido.localId);
    const visitante = tabla.find(e => e.id === partido.visitanteId);

    if (local && visitante) {
      local.pj++;
      visitante.pj++;
      local.gf += partido.golesLocal;
      local.gc += partido.golesVisitante;
      visitante.gf += partido.golesVisitante;
      visitante.gc += partido.golesLocal;

      if (partido.golesLocal > partido.golesVisitante) {
        local.pg++;
        local.pts += 3;
        visitante.pp++;
      } else if (partido.golesLocal < partido.golesVisitante) {
        visitante.pg++;
        visitante.pts += 3;
        local.pp++;
      } else {
        local.pe++;
        visitante.pe++;
        local.pts++;
        visitante.pts++;
      }

      local.dg = local.gf - local.gc;
      visitante.dg = visitante.gf - visitante.gc;
    }
  });

  return tabla.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
}

// Servidor HTTP
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }


  // Rutas de archivos estáticos
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(res, path.join(__dirname, 'public', 'index.html'));
    return;
  }

  if (pathname === '/styles.css') {
    serveStaticFile(res, path.join(__dirname, 'public', 'styles.css'));
    return;
  }

  if (pathname === '/app.js') {
    serveStaticFile(res, path.join(__dirname, 'public', 'app.js'));
    return;
  }

  if (pathname === '/pronosticos/predictor.js') {
    serveStaticFile(res, path.join(__dirname, 'public', 'pronosticos', 'predictor.js'));
    return;
  }

  // API Routes
  if (pathname === '/api/ligas' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ligas));
    return;
  }

  if (pathname === '/api/ligas' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { nombre, numEquipos } = JSON.parse(body);
        
        const equipos = Array.from({ length: numEquipos }, (_, i) => ({
          id: i + 1,
          nombre: `Equipo ${i + 1}`
        }));

        const nuevaLiga = {
          id: ligaIdCounter++,
          nombre,
          equipos,
          partidos: []
        };

        ligas.push(nuevaLiga);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevaLiga));
      } catch (error) {
        console.error('Error al crear liga:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error interno del servidor' }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/ligas/') && req.method === 'GET') {
    const id = parseInt(pathname.split('/')[3]);
    const liga = ligas.find(l => l.id === id);
    
    if (liga) {
      const tabla = calcularTabla(liga.equipos, liga.partidos);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...liga, tabla }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Liga no encontrada' }));
    }
    return;
  }

  if (pathname.startsWith('/api/ligas/') && pathname.endsWith('/equipos') && req.method === 'PUT') {
    const id = parseInt(pathname.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { equipos } = JSON.parse(body);
      const liga = ligas.find(l => l.id === id);
      
      if (liga) {
        liga.equipos = equipos;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(liga));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Liga no encontrada' }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/ligas/') && pathname.endsWith('/partidos') && req.method === 'POST') {
    const id = parseInt(pathname.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { localId, visitanteId, jornada } = JSON.parse(body);
      const liga = ligas.find(l => l.id === id);
      
      if (liga) {
        // Validar que un equipo no juegue contra sí mismo
        if (localId === visitanteId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Un equipo no puede jugar contra sí mismo' }));
          return;
        }
        
        // Validar que los mismos equipos no se enfrenten en la misma jornada
        const partidoExistente = liga.partidos.find(p => 
          p.jornada === jornada && 
          (
            (p.localId === localId && p.visitanteId === visitanteId) ||
            (p.localId === visitanteId && p.visitanteId === localId)
          )
        );
        
        if (partidoExistente) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Estos equipos ya se enfrentan en esta jornada' }));
          return;
        }
        
        const nuevoPartido = {
          id: partidoIdCounter++,
          localId,
          visitanteId,
          jornada,
          golesLocal: 0,
          golesVisitante: 0,
          jugado: false
        };
        
        liga.partidos.push(nuevoPartido);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevoPartido));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Liga no encontrada' }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/partidos/') && req.method === 'PUT') {
    const partidoId = parseInt(pathname.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      
      let partidoEncontrado = null;
      let ligaEncontrada = null;
      
      for (const liga of ligas) {
        const partido = liga.partidos.find(p => p.id === partidoId);
        if (partido) {
          // Actualizar resultado
          partido.golesLocal = data.golesLocal;
          partido.golesVisitante = data.golesVisitante;
          partido.jugado = true;
          
          // Actualizar goles por tiempo si existen
          if (data.golesPorTiempo) {
            partido.golesPorTiempo = data.golesPorTiempo;
          }
          
          // Actualizar estadísticas si existen
          if (data.estadisticas) {
            partido.estadisticas = data.estadisticas;
          }
          
          partidoEncontrado = partido;
          ligaEncontrada = liga;
          break;
        }
      }
      
      if (partidoEncontrado) {
        const tabla = calcularTabla(ligaEncontrada.equipos, ligaEncontrada.partidos);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ partido: partidoEncontrado, tabla }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Partido no encontrado' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 - Página no encontrada</h1>');
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});