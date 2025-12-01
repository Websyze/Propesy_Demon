# Cambios - Mercados de Apuestas

## Descripción
Se han implementado los mercados de apuestas deportivas con el formato estándar de apuestas (Menos/Más 0.5, 1.5, 2.5, 3.5, 4.5, 5.5, etc.) en los pronósticos.

## Archivos Modificados

### 1. `public/pronosticos/predictor.js`
**Línea 279-316**: Actualización de `mercadosApuestas`

Se expandieron los rangos de pronósticos para incluir más opciones de apuestas:

#### Goles Totales
- Menos de 0.5 / Más de 0.5
- Menos de 1.5 / Más de 1.5
- Menos de 2.5 / Más de 2.5
- Menos de 3.5 / Más de 3.5
- Menos de 4.5 / Más de 4.5
- Menos de 5.5 / Más de 5.5

#### Corners
- Menos de 3.5 / Más de 3.5
- Menos de 5.5 / Más de 5.5
- Menos de 7.5 / Más de 7.5
- Menos de 9.5 / Más de 9.5

#### Tarjetas Amarillas
- Menos de 1.5 / Más de 1.5
- Menos de 2.5 / Más de 2.5
- Menos de 3.5 / Más de 3.5
- Menos de 4.5 / Más de 4.5

#### Otros Mercados
- **Ambos Marcan**: Sí/No en 1er tiempo, 2do tiempo y partido completo
- **Tarjeta Roja**: Probabilidad general

### 2. `public/app.js`
**Línea 905-1020**: Adición de sección de mercados de apuestas

Se agregó:
1. **Nueva sección HTML** en `generarHTMLPronosticoDetallado()` que incluye la llamada a `generarHTMLMercadosApuestas()`
2. **Nueva función** `generarHTMLMercadosApuestas()` (líneas 975-1020) que:
   - Formatea todos los mercados de apuestas
   - Muestra probabilidades de Menos/Más para cada rango
   - Destaca la opción más probable con color verde (#e8f5e9)
   - Organiza los mercados en secciones claras

### 3. `public/styles.css`
**Líneas 1215-1283**: Estilos CSS para mercados de apuestas

Se agregaron estilos para:
- `.mercados-apuestas`: Contenedor principal con fondo degradado
- `.mercados-container`: Grid responsive para los mercados
- `.mercado-section`: Tarjetas individuales de cada mercado
- `.mercado-opciones`: Layout de opciones (Menos/Más)
- `.opcion-mercado`: Botones de opciones con hover effects
- `.opcion-mercado.ganador`: Estilos para la opción más probable (color verde)
- Responsive design para dispositivos móviles

## Características

✅ **Formato estándar de apuestas**: Usa los rangos 0.5, 1.5, 2.5, 3.5, etc. como en las casas de apuestas reales

✅ **Probabilidades calculadas**: Cada opción muestra la probabilidad en porcentaje

✅ **Opción destacada**: La opción más probable está resaltada en verde

✅ **Responsive**: Se adapta a diferentes tamaños de pantalla

✅ **Múltiples mercados**: Goles, Corners, Tarjetas Amarillas, Ambos Marcan

✅ **Interfaz intuitiva**: Organizado en secciones claras y fáciles de leer

## Cómo Funciona

1. Cuando haces clic en "👆 Haz clic para ver análisis completo" en un pronóstico
2. Se abre la vista detallada del pronóstico
3. Desplázate hasta la sección "💰 Mercados de Apuestas"
4. Verás todos los mercados disponibles con sus opciones Menos/Más
5. La opción más probable está resaltada en verde

## Ejemplo de Uso

Para un partido donde se esperan 2.3 goles totales:
- **Menos de 0.5**: Baja probabilidad (~5%)
- **Más de 0.5**: Alta probabilidad (~95%)
- **Menos de 1.5**: Probabilidad media (~30%)
- **Más de 1.5**: Probabilidad media (~70%)
- **Menos de 2.5**: Probabilidad media (~45%)
- **Más de 2.5**: Probabilidad media (~55%)
- **Menos de 3.5**: Alta probabilidad (~75%)
- **Más de 3.5**: Baja probabilidad (~25%)

## Próximas Mejoras Sugeridas

- Agregar más mercados (Goles 1er/2do tiempo, Remates al arco)
- Integrar cuotas de apuestas reales
- Permitir cambiar los rangos según preferencias
- Historial de predicciones vs resultados
