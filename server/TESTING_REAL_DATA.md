# Guía para Probar Datos Reales

Esta guía te ayudará a probar y depurar la obtención de datos reales del presupuesto.

## Cómo Probar

### Opción 1: Usar Archivos CSV Locales (Recomendado)

1. **Descarga un archivo CSV del presupuesto**:
   - Visita: https://www.sepg.pap.hacienda.gob.es
   - Navega a los Presupuestos Generales del Estado
   - Descarga un archivo CSV de liquidación o ejecución presupuestaria

2. **Coloca el archivo en la carpeta local**:
   ```
   server/data/csv/
   ```
   
   Nombra el archivo con uno de estos formatos:
   - `2024_liquidacion.csv` (recomendado, incluye el año)
   - `liquidacion.csv` (si solo tienes un año)

3. **Inicia el servidor**:
   ```bash
   cd server
   npm run dev
   ```

4. **Haz una petición al endpoint**:
   ```bash
   # Desde otra terminal o usando Swagger UI
   curl http://localhost:5000/api/budget/summary/2024
   ```
   
   O abre Swagger UI en: http://localhost:5000/api-docs

5. **Revisa los logs del servidor**:
   Verás mensajes detallados como:
   ```
   🔍 Fetching real budget data for year 2024...
   📥 Strategy 1: Ministerio de Hacienda CSV files
   📁 Reading local CSV file: ...
   ✓ Successfully read X records from local file
   📊 CSV columns found: ...
   ✓ Normalized X budget items
   ```

### Opción 2: Descargar desde Internet

Si no tienes archivos locales, el sistema intentará descargarlos automáticamente desde:
```
https://www.sepg.pap.hacienda.gob.es/Presup/PGE{year}/Liquidacion/csv/
```

**Nota**: Las URLs pueden no estar disponibles o tener una estructura diferente. Si falla, usa la Opción 1.

## Depuración

### Ver qué está pasando

Los logs del servidor mostrarán información detallada:

1. **Si encuentra archivos locales**:
   ```
   📁 Reading local CSV file: ...
   ✓ Successfully read X records
   ```

2. **Si intenta descargar desde internet**:
   ```
   🌐 No local CSV files found, trying to download...
   Base URL: https://www.sepg.pap.hacienda.gob.es/Presup/PGE2024/Liquidacion/csv/
   Trying: https://.../liquidacion.csv
   ✗ liquidacion.csv: HTTP 404 - Not Found
   ```

3. **Si encuentra datos pero no puede normalizarlos**:
   ```
   📊 CSV columns found: col1, col2, col3
   Amount column: NOT FOUND
   Concept column: NOT FOUND
   ⚠ CSV data found but could not normalize any records
   ```

### Problemas Comunes

#### 1. "No CSV data found"

**Causa**: No hay archivos locales y las URLs remotas no están disponibles.

**Solución**: 
- Descarga un CSV manualmente y colócalo en `server/data/csv/`
- Verifica que el nombre del archivo coincida con los nombres soportados

#### 2. "CSV data found but could not normalize any records"

**Causa**: El CSV tiene columnas con nombres diferentes a los esperados.

**Solución**:
- Revisa los logs para ver qué columnas tiene tu CSV
- Edita `server/src/services/dataService.ts` y añade los nombres de columnas de tu CSV a las listas de búsqueda:
  - `amountColumn`: busca columnas con importes
  - `conceptColumn`: busca columnas con conceptos/descripciones
  - `categoryColumn`: busca columnas con categorías

#### 3. "Amount column: NOT FOUND"

**Causa**: El CSV no tiene una columna con un nombre reconocible para los importes.

**Solución**:
- Abre tu CSV y verifica el nombre de la columna que contiene los importes
- Añade ese nombre a la lista en `normalizeCSVData()`:
  ```typescript
  const amountColumn = columns.find(col =>
    ['importe', 'amount', 'cantidad', 'valor', 'total', 'euros', 
     'TU_COLUMNA_AQUI'].includes(col.toLowerCase())
  );
  ```

#### 4. Errores de formato de números

**Causa**: Los números en el CSV pueden tener un formato diferente (ej: con espacios, formato español vs inglés).

**Solución**: La función `parseAmount()` ya maneja varios formatos, pero si tienes problemas:
- Revisa el formato de los números en tu CSV
- Ajusta la función `parseAmount()` si es necesario

## Estructura del CSV Esperada

El sistema es flexible y puede manejar diferentes estructuras, pero idealmente tu CSV debería tener:

| Concepto | Importe | Tipo |
|----------|---------|------|
| Pensiones | 140000000000 | Gasto |
| IRPF | 95000000000 | Ingreso |

O variaciones como:
- `Descripción`, `Cantidad`, `Categoría`
- `Nombre`, `Valor`, `Clase`
- etc.

## Próximos Pasos

1. **Prueba con un archivo real**: Descarga un CSV del Ministerio de Hacienda
2. **Revisa los logs**: Verás exactamente qué está pasando
3. **Ajusta el código si es necesario**: Si tu CSV tiene una estructura diferente, ajusta las funciones de normalización
4. **Comparte los resultados**: Si encuentras problemas, los logs te darán información útil para depurar

## Ejemplo de Uso con Swagger

1. Inicia el servidor: `npm run dev`
2. Abre: http://localhost:5000/api-docs
3. Expande el endpoint `GET /api/budget/summary/{year}`
4. Haz clic en "Try it out"
5. Introduce un año (ej: 2024)
6. Haz clic en "Execute"
7. Revisa la respuesta y los logs del servidor


