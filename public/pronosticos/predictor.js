// predictor.js
// Sistema de pronósticos para ligas deportivas

class PronosticadorPartidos {
    constructor() {
        // Configuración del algoritmo de pronósticos
        this.PARTIDOS_HISTORICOS = 10; // Últimos 10 partidos para análisis estadístico
        
        // Rangos de predicción para apuestas deportivas (formato decimal)
        this.RANGOS_GOLES = [0.5, 1.5, 2.5, 3.5, 4.5]; // Umbrales para menos/más goles
        this.RANGOS_REMATES = [7.5, 9.5, 12.5, 15.5]; // Umbrales para menos/más remates
        this.RANGOS_REMATES_ARCO = [2.5, 3.5, 4.5, 5.5, 6.5]; // Umbrales para remates al arco
        this.RANGOS_PASES = [249.5, 299.5, 349.5, 399.5, 449.5, 499.5]; // Umbrales para pases
        this.RANGOS_FALTAS = [9.5, 11.5, 13.5, 15.5]; // Umbrales para faltas
        this.RANGOS_TARJETAS = [1.5, 2.5, 3.5, 4.5]; // Umbrales para menos/más tarjetas amarillas
        this.RANGOS_FUERA_LUGAR = [1.5, 2.5, 3.5, 4.5]; // Umbrales para fuera de lugar
        this.RANGOS_CORNERS = [3.5, 5.5, 7.5, 9.5, 11.5]; // Umbrales para menos/más tiros de esquina
        
        // Factores de ajuste para diferentes condiciones de juego

        this.FACTOR_LOCAL = 1.15; // Ventaja de jugar en casa (+15%)
        this.FACTOR_VISITANTE = 0.95; // Desventaja de jugar de visitante (-5%)
        
        // TODO: Mejoras futuras del algoritmo:
        // - Consideración de rendimiento local vs visitante específico por equipo
        // - Tendencias de forma actual del equipo (últimos 3-5 partidos)
        // - Análisis de enfrentamientos directos históricos
        // - Factores de temporada (inicio, mitad, final)
        // - Estado físico del equipo (lesiones, descanso)
        // - Condiciones climáticas y del terreno de juego
    }

    /**
     * Redondea un valor a la nomenclatura de líneas .5 (apuestas)
     * - Modo estándar: aproxima al múltiplo más cercano de 0.5 (puede terminar en .0 o .5)
     * - Para forzar siempre terminar en .5 se podría usar Math.floor(x)+0.5
     * @param {number} valor
     * @param {boolean} soloCinco - si true fuerza siempre X.5
     * @returns {string} valor formateado con una decimal
     */
    redondearLineaHalf(valor, soloCinco = false) {
        const base = Math.max(0, valor);
        if (soloCinco) {
            // Si es muy pequeño (casi cero) devolver 0.5 para mantener nomenclatura
            if (base < 0.25) return '0.5';
            return (Math.floor(base) + 0.5).toFixed(1);
        }
        const redondeado = Math.round(base * 2) / 2;
        // Ajustar 0.0 a 0.5 para mantener estándar visual si se requiere .5
        return redondeado === 0 ? '0.5' : redondeado.toFixed(1);
    }

    /**
     * Calcula estadísticas promedio de un equipo basado en sus últimos partidos
     * @param {Object} equipo - Datos del equipo
     * @param {Array} partidos - Lista de todos los partidos del equipo
     * @param {boolean} esLocal - Si el pronóstico es para partido como local
     * @returns {Object} Estadísticas promedio del equipo
     */
    calcularEstadisticasEquipo(equipo, partidos, esLocal = true) {
        // Filtrar partidos jugados del equipo
        const partidosEquipo = partidos
            .filter(p => p.jugado && (p.localId === equipo.id || p.visitanteId === equipo.id))
            .slice(-this.PARTIDOS_HISTORICOS); // Últimos 10 partidos

        if (partidosEquipo.length === 0) {
            return this.obtenerEstadisticasPorDefecto();
        }

        // Inicializar objeto de estadísticas con todas las métricas necesarias
        const estadisticas = {
            // Estadísticas de goles
            goles: 0, // Total de goles anotados
            golesRecibidos: 0, // Total de goles recibidos
            golesPrimerTiempo: 0, // Goles en primera mitad
            golesSegundoTiempo: 0, // Goles en segunda mitad
            
            // Estadísticas de remates
            remates: 0, // Total de remates realizados
            rematesArco: 0, // Remates dirigidos al arco
            
            // Estadísticas de posesión y pases
            posesion: 50, // Porcentaje de posesión del balón
            pases: 0, // Número total de pases
            precisionPases: 0, // Porcentaje de precisión en pases
            
            // Estadísticas disciplinarias
            faltas: 0, // Faltas cometidas
            amarillas: 0, // Tarjetas amarillas recibidas
            rojas: 0, // Tarjetas rojas recibidas
            
            // Otras estadísticas del juego
            fueraLugar: 0, // Fueras de lugar cometidos
            corners: 0, // Tiros de esquina a favor
            
            // Contador para promedios
            partidos: partidosEquipo.length // Número de partidos analizados
        };

        // Procesar cada partido para calcular estadísticas promedio
        partidosEquipo.forEach(partido => {
            const esEquipoLocal = partido.localId === equipo.id;
            
            // Procesar goles a favor y en contra
            if (esEquipoLocal) {
                estadisticas.goles += partido.golesLocal || 0;
                estadisticas.golesRecibidos += partido.golesVisitante || 0;
                
                // Procesar goles por tiempo si están disponibles
                if (partido.golesPorTiempo) {
                    estadisticas.golesPrimerTiempo += partido.golesPorTiempo.localPrimero || 0;
                    estadisticas.golesSegundoTiempo += partido.golesPorTiempo.localSegundo || 0;
                }
            } else {
                estadisticas.goles += partido.golesVisitante || 0;
                estadisticas.golesRecibidos += partido.golesLocal || 0;
                
                // Procesar goles por tiempo si están disponibles
                if (partido.golesPorTiempo) {
                    estadisticas.golesPrimerTiempo += partido.golesPorTiempo.visitantePrimero || 0;
                    estadisticas.golesSegundoTiempo += partido.golesPorTiempo.visitanteSegundo || 0;
                }
            }

            // Procesar estadísticas detalladas del partido si están disponibles
            if (partido.estadisticas) {
                const stats = esEquipoLocal ? partido.estadisticas.local : partido.estadisticas.visitante;
                
                // Estadísticas de ataque y creación de juego
                estadisticas.remates += stats.remates || 0;
                estadisticas.rematesArco += stats.rematesArco || 0;
                estadisticas.corners += stats.corners || 0;
                
                // Estadísticas de control del juego
                estadisticas.posesion += stats.posesion || 50;
                estadisticas.pases += stats.pases || 0;
                estadisticas.precisionPases += stats.precisionPases || 0;
                
                // Estadísticas disciplinarias
                estadisticas.faltas += stats.faltas || 0;
                estadisticas.amarillas += stats.amarillas || 0;
                estadisticas.rojas += stats.rojas || 0;
                
                // Otras estadísticas
                estadisticas.fueraLugar += stats.fueraLugar || 0;
            }
        });

        // Calcular promedios dividiendo totales entre número de partidos
        Object.keys(estadisticas).forEach(key => {
            if (key !== 'partidos') {
                estadisticas[key] = estadisticas[key] / estadisticas.partidos;
            }
        });

        return estadisticas;
    }

    /**
     * Obtiene estadísticas promedio por defecto cuando un equipo no tiene historial
     * Basado en promedios típicos del fútbol profesional
     * @returns {Object} Estadísticas promedio por defecto
     */
    obtenerEstadisticasPorDefecto() {
        return {
            // Estadísticas de goles (promedio estándar en fútbol)
            goles: 1.2, // Promedio de goles por partido
            golesRecibidos: 1.2, // Promedio de goles recibidos
            golesPrimerTiempo: 0.6, // ~50% de goles en primer tiempo
            golesSegundoTiempo: 0.6, // ~50% de goles en segundo tiempo
            
            // Estadísticas de ataque
            remates: 10.5, // Promedio de remates por partido
            rematesArco: 4.5, // Promedio de remates al arco
            
            // Estadísticas de control del juego
            posesion: 50, // Posesión equilibrada por defecto
            pases: 350.5, // Promedio de pases por partido
            precisionPases: 75.5, // Porcentaje de precisión típico
            
            // Estadísticas disciplinarias
            faltas: 12.5, // Promedio de faltas por partido
            amarillas: 1.8, // Promedio de tarjetas amarillas
            rojas: 0.1, // Tarjetas rojas son poco frecuentes
            
            // Otras estadísticas
            fueraLugar: 2.5, // Promedio de fueras de lugar
            corners: 5.5, // Promedio de corners por partido
            
            partidos: 0 // Indicador de que no hay historial
        };
    }

    /**
     * Calcula el pronóstico para un partido específico
     * @param {Object} equipoLocal - Datos del equipo local
     * @param {Object} equipoVisitante - Datos del equipo visitante
     * @param {Array} partidos - Lista de todos los partidos
     * @returns {Object} Pronóstico completo del partido
     */
    pronosticarPartido(equipoLocal, equipoVisitante, partidos) {
        // Calcular estadísticas históricas de ambos equipos
        const statsLocal = this.calcularEstadisticasEquipo(equipoLocal, partidos, true);
        const statsVisitante = this.calcularEstadisticasEquipo(equipoVisitante, partidos, false);

        // Aplicar factores de localía (ventaja estadística comprobada)
        const factorLocal = this.FACTOR_LOCAL; // Ventaja de jugar en casa
        const factorVisitante = this.FACTOR_VISITANTE; // Desventaja de jugar de visitante

        const pronostico = {
            equipoLocal: {
                nombre: equipoLocal.nombre,
                foto: equipoLocal.foto,
                estadisticas: {
                    // Estadísticas de goles con decimales para mayor precisión
                    golesEsperados: this.redondearLineaHalf(statsLocal.goles * factorLocal, true),
                    golesPrimerTiempoEsperados: this.redondearLineaHalf(statsLocal.golesPrimerTiempo * factorLocal, true),
                    golesSegundoTiempoEsperados: this.redondearLineaHalf(statsLocal.golesSegundoTiempo * factorLocal, true),
                    
                    // Estadísticas de remates (con precisión decimal)
                    rematesEsperados: this.redondearLineaHalf(statsLocal.remates * factorLocal, true),
                    rematesArcoEsperados: this.redondearLineaHalf(statsLocal.rematesArco * factorLocal, true),
                    
                    // Estadísticas de control del juego
                    posesionEsperada: Math.min(100, Math.max(0, (statsLocal.posesion * factorLocal).toFixed(1))),
                    pasesEsperados: this.redondearLineaHalf(statsLocal.pases * factorLocal, true),
                    precisionPasesEsperada: Math.min(100, Math.max(0, statsLocal.precisionPases.toFixed(1))),
                    
                    // Estadísticas disciplinarias
                    faltasEsperadas: this.redondearLineaHalf(statsLocal.faltas, true),
                    amarillasEsperadas: this.redondearLineaHalf(statsLocal.amarillas, true),
                    rojasEsperadas: Math.max(0, statsLocal.rojas.toFixed(1)),
                    probabilidadTarjetaRoja: this.calcularProbabilidadTarjetaRoja(statsLocal.rojas),
                    
                    // Otras estadísticas
                    fueraLugarEsperados: this.redondearLineaHalf(statsLocal.fueraLugar, true),
                    cornersEsperados: this.redondearLineaHalf(statsLocal.corners * factorLocal, true),
                    
                    // Información adicional
                    partidosAnalizados: statsLocal.partidos
                }
            },
            equipoVisitante: {
                nombre: equipoVisitante.nombre,
                foto: equipoVisitante.foto,
                estadisticas: {
                    // Estadísticas de goles con decimales para mayor precisión
                    golesEsperados: this.redondearLineaHalf(statsVisitante.goles * factorVisitante, true),
                    golesPrimerTiempoEsperados: this.redondearLineaHalf(statsVisitante.golesPrimerTiempo * factorVisitante, true),
                    golesSegundoTiempoEsperados: this.redondearLineaHalf(statsVisitante.golesSegundoTiempo * factorVisitante, true),
                    
                    // Estadísticas de remates (con precisión decimal)
                    rematesEsperados: this.redondearLineaHalf(statsVisitante.remates * factorVisitante, true),
                    rematesArcoEsperados: this.redondearLineaHalf(statsVisitante.rematesArco * factorVisitante, true),
                    
                    // Estadísticas de control del juego
                    posesionEsperada: Math.min(100, Math.max(0, (statsVisitante.posesion * factorVisitante).toFixed(1))),
                    pasesEsperados: this.redondearLineaHalf(statsVisitante.pases * factorVisitante, true),
                    precisionPasesEsperada: Math.min(100, Math.max(0, statsVisitante.precisionPases.toFixed(1))),
                    
                    // Estadísticas disciplinarias
                    faltasEsperadas: this.redondearLineaHalf(statsVisitante.faltas, true),
                    amarillasEsperadas: this.redondearLineaHalf(statsVisitante.amarillas, true),
                    rojasEsperadas: Math.max(0, statsVisitante.rojas.toFixed(1)),
                    probabilidadTarjetaRoja: this.calcularProbabilidadTarjetaRoja(statsVisitante.rojas),
                    
                    // Otras estadísticas
                    fueraLugarEsperados: this.redondearLineaHalf(statsVisitante.fueraLugar, true),
                    cornersEsperados: this.redondearLineaHalf(statsVisitante.corners * factorVisitante, true),
                    
                    // Información adicional
                    partidosAnalizados: statsVisitante.partidos
                }
            }
        };

        // Construcción de mercados de apuestas con nomenclatura .5
        const promedioGolesTotales = (statsLocal.goles + statsVisitante.goles) * (factorLocal + factorVisitante) / 2;
        const promedioCornersTotales = (statsLocal.corners + statsVisitante.corners) * (factorLocal + factorVisitante) / 2;
        const promedioTarjetasAmarillasTotales = (statsLocal.amarillas + statsVisitante.amarillas) * (factorLocal + factorVisitante) / 2;
        const promedioRematesTotales = (statsLocal.remates + statsVisitante.remates) * (factorLocal + factorVisitante) / 2;
        const promedioRematesArcoTotales = (statsLocal.rematesArco + statsVisitante.rematesArco) * (factorLocal + factorVisitante) / 2;
        const promedioPasesTotales = (statsLocal.pases + statsVisitante.pases) * (factorLocal + factorVisitante) / 2;
        const promedioFaltasTotales = (statsLocal.faltas + statsVisitante.faltas) * (factorLocal + factorVisitante) / 2;
        const promedioFueraLugarTotales = (statsLocal.fueraLugar + statsVisitante.fueraLugar) * (factorLocal + factorVisitante) / 2;

        const mercadosApuestas = {
            golesTotales: this.RANGOS_GOLES.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioGolesTotales, linea)
            })),
            cornersTotales: this.RANGOS_CORNERS.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioCornersTotales, linea)
            })),
            amarillasTotales: this.RANGOS_TARJETAS.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioTarjetasAmarillasTotales, linea)
            })),
            rematesTotales: this.RANGOS_REMATES.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioRematesTotales, linea)
            })),
            rematesArcoTotales: this.RANGOS_REMATES_ARCO.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioRematesArcoTotales, linea)
            })),
            pasesTotales: this.RANGOS_PASES.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioPasesTotales, linea)
            })),
            faltasTotales: this.RANGOS_FALTAS.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioFaltasTotales, linea)
            })),
            fueraLugarTotales: this.RANGOS_FUERA_LUGAR.map(linea => ({
                linea,
                ...this.calcularOverUnder(promedioFueraLugarTotales, linea)
            })),
            ambosMarcan: {
                partidoCompleto: this.calcularAmbosMarcan(statsLocal.goles, statsVisitante.goles),
                primerTiempo: this.calcularAmbosMarcan(statsLocal.golesPrimerTiempo, statsVisitante.golesPrimerTiempo),
                segundoTiempo: this.calcularAmbosMarcan(statsLocal.golesSegundoTiempo, statsVisitante.golesSegundoTiempo)
            },
            roja: this.calcularProbabilidadTarjetaRoja((statsLocal.rojas + statsVisitante.rojas) / 2)
        };

        // Ajustar posesión para que sume 100%
        const posesionTotal = pronostico.equipoLocal.estadisticas.posesionEsperada + 
                             pronostico.equipoVisitante.estadisticas.posesionEsperada;
        if (posesionTotal !== 100) {
            const factor = 100 / posesionTotal;
            pronostico.equipoLocal.estadisticas.posesionEsperada = 
                Math.round(pronostico.equipoLocal.estadisticas.posesionEsperada * factor);
            pronostico.equipoVisitante.estadisticas.posesionEsperada = 
                100 - pronostico.equipoLocal.estadisticas.posesionEsperada;
        }

        // Calcular probabilidades de resultado
        const golesLocal = parseFloat(pronostico.equipoLocal.estadisticas.golesEsperados);
        const golesVisitante = parseFloat(pronostico.equipoVisitante.estadisticas.golesEsperados);
        
        pronostico.probabilidades = this.calcularProbabilidades(golesLocal, golesVisitante);

        // Calcular mercados de apuestas adicionales
        const golesTotal = golesLocal + golesVisitante;
        const rematesTotal = parseFloat(pronostico.equipoLocal.estadisticas.rematesEsperados) + 
                            parseFloat(pronostico.equipoVisitante.estadisticas.rematesArcoEsperados);
        const amarillasTotal = parseFloat(pronostico.equipoLocal.estadisticas.amarillasEsperadas) + 
                              parseFloat(pronostico.equipoVisitante.estadisticas.amarillasEsperadas);
        const cornersTotal = parseFloat(pronostico.equipoLocal.estadisticas.cornersEsperados) + 
                            parseFloat(pronostico.equipoVisitante.estadisticas.cornersEsperados);
        
        // Mercados Over/Under con rangos completos para apuestas deportivas
        pronostico.mercadosApuestas = {
            goles: {
                menos05: this.calcularOverUnder(golesTotal, 0.5),
                mas05: this.calcularOverUnder(golesTotal, 0.5),
                menos15: this.calcularOverUnder(golesTotal, 1.5),
                mas15: this.calcularOverUnder(golesTotal, 1.5),
                menos25: this.calcularOverUnder(golesTotal, 2.5),
                mas25: this.calcularOverUnder(golesTotal, 2.5),
                menos35: this.calcularOverUnder(golesTotal, 3.5),
                mas35: this.calcularOverUnder(golesTotal, 3.5),
                menos45: this.calcularOverUnder(golesTotal, 4.5),
                mas45: this.calcularOverUnder(golesTotal, 4.5),
                menos55: this.calcularOverUnder(golesTotal, 5.5),
                mas55: this.calcularOverUnder(golesTotal, 5.5)
            },
            remates: {
                menos65: this.calcularOverUnder(rematesTotal, 6.5),
                mas65: this.calcularOverUnder(rematesTotal, 6.5),
                menos85: this.calcularOverUnder(rematesTotal, 8.5),
                mas85: this.calcularOverUnder(rematesTotal, 8.5),
                menos105: this.calcularOverUnder(rematesTotal, 10.5),
                mas105: this.calcularOverUnder(rematesTotal, 10.5)
            },
            tarjetasAmarillas: {
                menos15: this.calcularOverUnder(amarillasTotal, 1.5),
                mas15: this.calcularOverUnder(amarillasTotal, 1.5),
                menos25: this.calcularOverUnder(amarillasTotal, 2.5),
                mas25: this.calcularOverUnder(amarillasTotal, 2.5),
                menos35: this.calcularOverUnder(amarillasTotal, 3.5),
                mas35: this.calcularOverUnder(amarillasTotal, 3.5),
                menos45: this.calcularOverUnder(amarillasTotal, 4.5),
                mas45: this.calcularOverUnder(amarillasTotal, 4.5)
            },
            corners: {
                menos35: this.calcularOverUnder(cornersTotal, 3.5),
                mas35: this.calcularOverUnder(cornersTotal, 3.5),
                menos55: this.calcularOverUnder(cornersTotal, 5.5),
                mas55: this.calcularOverUnder(cornersTotal, 5.5),
                menos75: this.calcularOverUnder(cornersTotal, 7.5),
                mas75: this.calcularOverUnder(cornersTotal, 7.5),
                menos95: this.calcularOverUnder(cornersTotal, 9.5),
                mas95: this.calcularOverUnder(cornersTotal, 9.5)
            },
            ambosMarcan: {
                primerTiempo: this.calcularAmbosMarcan(
                    parseFloat(pronostico.equipoLocal.estadisticas.golesPrimerTiempoEsperados),
                    parseFloat(pronostico.equipoVisitante.estadisticas.golesPrimerTiempoEsperados)
                ),
                segundoTiempo: this.calcularAmbosMarcan(
                    parseFloat(pronostico.equipoLocal.estadisticas.golesSegundoTiempoEsperados),
                    parseFloat(pronostico.equipoVisitante.estadisticas.golesSegundoTiempoEsperados)
                ),
                partidoCompleto: this.calcularAmbosMarcan(golesLocal, golesVisitante)
            },
            tarjetaRoja: {
                probabilidad: Math.round((parseFloat(pronostico.equipoLocal.estadisticas.probabilidadTarjetaRoja) + 
                                        parseFloat(pronostico.equipoVisitante.estadisticas.probabilidadTarjetaRoja)) / 2)
            }
        };

        return pronostico;
    }

    /**
     * Calcula la probabilidad de que se muestre una tarjeta roja
     * @param {number} promedioRojas - Promedio histórico de tarjetas rojas
     * @returns {number} Probabilidad en porcentaje (0-100)
     */
    calcularProbabilidadTarjetaRoja(promedioRojas) {
        // Convertir promedio a probabilidad porcentual
        // Si un equipo recibe 0.1 rojas por partido, eso es 10% de probabilidad
        const probabilidad = Math.min(promedioRojas * 100, 100);
        return Math.round(probabilidad);
    }

    /**
     * Calcula probabilidades de mercados de apuestas Over/Under
     * @param {number} valorPromedio - Valor promedio estadístico
     * @param {number} linea - Línea de apuesta (ej: 2.5 goles)
     * @returns {Object} Probabilidades de menos y más de la línea
     */
    calcularOverUnder(valorPromedio, linea) {
        // Algoritmo simplificado: distribución normal aproximada
        const diferencia = valorPromedio - linea;
        let probMas, probMenos;
        
        if (diferencia > 0.5) {
            probMas = 65 + Math.min(diferencia * 10, 25);
        } else if (diferencia < -0.5) {
            probMas = 35 - Math.min(Math.abs(diferencia) * 10, 25);
        } else {
            probMas = 50 + (diferencia * 20);
        }
        
        probMenos = 100 - probMas;
        return {
            mas: Math.round(probMas),
            menos: Math.round(probMenos)
        };
    }

    /**
     * Calcula si ambos equipos marcarán en cada tiempo
     * @param {number} golesLocalTiempo - Goles promedio del local en el tiempo
     * @param {number} golesVisitanteTiempo - Goles promedio del visitante en el tiempo
     * @returns {Object} Probabilidades de que ambos marquen
     */
    calcularAmbosMarcan(golesLocalTiempo, golesVisitanteTiempo) {
        // Probabilidad de que cada equipo marque al menos un gol en el tiempo
        const probLocalMarca = Math.min(golesLocalTiempo * 60, 85);
        const probVisitanteMarca = Math.min(golesVisitanteTiempo * 60, 85);
        
        // Probabilidad de que ambos marquen (eventos independientes)
        const probAmbosMarcan = (probLocalMarca * probVisitanteMarca) / 100;
        
        return {
            si: Math.round(probAmbosMarcan),
            no: Math.round(100 - probAmbosMarcan)
        };
    }

    /**
     * Calcula las probabilidades de victoria, empate y derrota basado en goles esperados
     * Utiliza algoritmo simplificado considerando la diferencia de goles
     * @param {number} golesLocal - Goles esperados del equipo local
     * @param {number} golesVisitante - Goles esperados del equipo visitante
     * @returns {Object} Probabilidades del resultado en porcentajes
     */
    calcularProbabilidades(golesLocal, golesVisitante) {
        const diferencia = golesLocal - golesVisitante;
        
        // Algoritmo de probabilidades basado en diferencia de goles esperados
        // Considera ventajas estadísticas según la diferencia ofensiva
        let probLocal, probEmpate, probVisitante;
        
        if (Math.abs(diferencia) < 0.3) {
            // Partidos muy equilibrados (diferencia menor a 0.3 goles)
            // Probabilidades similares para todos los resultados
            probLocal = 35;
            probEmpate = 30;
            probVisitante = 35;
        } else if (diferencia > 0) {
            // El equipo local tiene ventaja ofensiva
            const ventaja = Math.min(diferencia * 20, 40); // Máximo 40% de ventaja
            probLocal = 45 + ventaja; // Aumenta probabilidad local
            probEmpate = 25; // Empate se mantiene constante
            probVisitante = 30 - ventaja; // Disminuye probabilidad visitante
        } else {
            // El equipo visitante tiene ventaja ofensiva
            const ventaja = Math.min(Math.abs(diferencia) * 20, 40);
            probLocal = 30 - ventaja; // Disminuye probabilidad local
            probEmpate = 25; // Empate se mantiene constante
            probVisitante = 45 + ventaja; // Aumenta probabilidad visitante
        }

        // Normalizar probabilidades para asegurar que sumen exactamente 100%
        const total = probLocal + probEmpate + probVisitante;
        return {
            local: Math.round((probLocal / total) * 100), // Probabilidad victoria local
            empate: Math.round((probEmpate / total) * 100), // Probabilidad empate
            visitante: Math.round((probVisitante / total) * 100) // Probabilidad victoria visitante
        };
    }

    /**
     * Genera pronósticos para todos los partidos pendientes de todas las ligas del sistema
     * Aplica el algoritmo de análisis estadístico a cada partido no jugado
     * @param {Array} todasLasLigas - Array con todas las ligas del sistema
     * @returns {Array} Lista de pronósticos organizados por liga
     */
    generarPronosticosGlobales(todasLasLigas) {
        const pronosticos = [];

        // Procesar cada liga individualmente
        todasLasLigas.forEach(liga => {
            // Filtrar solo partidos que aún no se han jugado
            const partidosPendientes = liga.partidos.filter(p => !p.jugado);
            const pronosticosLiga = [];

            // Control para evitar duplicados: un equipo solo aparece en un pronóstico
            const equiposConPartido = new Set();
            
            // Procesar cada partido pendiente
            partidosPendientes.forEach(partido => {
                // Obtener información completa de ambos equipos
                const equipoLocal = liga.equipos.find(e => e.id === partido.localId);
                const equipoVisitante = liga.equipos.find(e => e.id === partido.visitanteId);

                // Evitar duplicados: solo incluir si ningún equipo ya tiene pronóstico
                if (!equiposConPartido.has(partido.localId) && !equiposConPartido.has(partido.visitanteId)) {
                    // Generar pronóstico completo para este enfrentamiento
                    const pronostico = this.pronosticarPartido(equipoLocal, equipoVisitante, liga.partidos);
                    
                    // Agregar metadatos del partido
                    pronostico.partidoId = partido.id;
                    pronostico.jornada = partido.jornada;
                    pronostico.ligaNombre = liga.nombre;
                    
                    // Guardar pronóstico y marcar equipos como procesados
                    pronosticosLiga.push(pronostico);
                    equiposConPartido.add(partido.localId);
                    equiposConPartido.add(partido.visitanteId);
                }
            });

            // Solo incluir la liga si tiene partidos para pronosticar
            if (pronosticosLiga.length > 0) {
                pronosticos.push({
                    liga: liga.nombre,
                    ligaId: liga.id,
                    partidos: pronosticosLiga
                });
            }
        });

        return pronosticos; // Retorna pronósticos organizados por liga
    }
}

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
    window.PronosticadorPartidos = PronosticadorPartidos;
} else if (typeof module !== 'undefined') {
    module.exports = PronosticadorPartidos;
}