# Guía para Obtener Datos Reales del Presupuesto Español

Esta guía explica cómo funciona el sistema de obtención de datos reales y cómo configurarlo.

## Estado Actual

El sistema está configurado para intentar obtener datos reales de múltiples fuentes:

1. **Ministerio de Hacienda (CSV)**: Intenta descargar archivos CSV de presupuestos
2. **datos.gob.es (API)**: Intenta usar la API de datos abiertos
3. **Fallback**: Si no hay datos reales disponibles, usa datos hardcodeados

## Cómo Funciona

### 1. Flujo de Obtención de Datos

Cuando se solicita el presupuesto de un año:

1. El servidor intenta obtener datos reales llamando a `fetchBudgetData(year)`
2. Si encuentra datos reales, los procesa y los devuelve
3. Si no encuentra datos reales, usa los datos hardcodeados como fallback

### 2. Fuentes de Datos

#### Ministerio de Hacienda (CSV)

El sistema intenta descargar archivos CSV desde:
```
https://www.sepg.pap.hacienda.gob.es/Presup/PGE{year}/Liquidacion/csv/
```

Intenta los siguientes nombres de archivo:
- `liquidacion.csv`
- `liquidacion_presupuesto.csv`
- `presupuesto.csv`
- `gastos.csv`
- `ingresos.csv`

**Nota**: Los nombres exactos de los archivos pueden variar según el año. Si los datos no se obtienen, es posible que necesites:

1. Visitar manualmente el sitio del Ministerio de Hacienda
2. Descargar los archivos CSV manualmente
3. Colocarlos en una carpeta local
4. Modificar el código para leer desde archivos locales

#### datos.gob.es (API)

El sistema intenta buscar datasets en el catálogo de datos abiertos:
```
https://datos.gob.es/apidata/catalog/dataset?q=presupuestos+{year}
```

**Nota**: Esta API puede requerir:
- Registro para obtener una API key
- Conocer el ID específico del dataset
- Ajustar el código según la estructura real de la API

## Cómo Obtener Datos Reales

### Opción 1: Usar Archivos CSV del Ministerio de Hacienda

1. **Visita el sitio oficial**:
   - https://www.sepg.pap.hacienda.gob.es
   - Navega a los Presupuestos Generales del Estado del año que necesites

2. **Descarga los archivos CSV**:
   - Busca la sección de "Liquidación" o "Ejecución Presupuestaria"
   - Descarga los archivos CSV disponibles

3. **Coloca los archivos localmente**:
   - Crea una carpeta `server/data/csv/` en el proyecto
   - Coloca los archivos CSV allí

4. **Modifica el código** (si es necesario):
   - Edita `server/src/services/dataService.ts`
   - Añade una función para leer archivos locales además de intentar descargarlos

### Opción 2: Usar la API de datos.gob.es

1. **Explora el catálogo**:
   - Visita https://datos.gob.es
   - Busca "presupuestos generales del estado"
   - Encuentra el dataset específico que necesitas

2. **Obtén el ID del dataset**:
   - Cada dataset tiene un ID único
   - Anota este ID

3. **Modifica el código**:
   - Edita `server/src/services/dataService.ts`
   - Actualiza la función `fetchDatosGobES` con el ID del dataset correcto
   - Si se requiere API key, añádela a las variables de entorno

### Opción 3: Usar la API JAXI del INE

1. **Explora la API JAXI**:
   - Visita https://www.ine.es/jaxi/api/
   - Busca tablas relacionadas con finanzas públicas

2. **Implementa el cliente**:
   - Añade una función en `dataService.ts` para llamar a la API JAXI
   - Procesa las respuestas JSON según la estructura de la API

## Estructura de Datos Esperada

El sistema espera datos en el siguiente formato:

```typescript
{
  year: number,
  category: 'income' | 'spending',
  type: string, // e.g., 'personal_income_tax', 'pensions', etc.
  amount: number, // en euros
  description?: string
}
```

## Tipos de Datos Soportados

### Ingresos (Income)
- `personal_income_tax` - IRPF
- `corporate_tax` - Impuesto de Sociedades
- `vat` - IVA
- `social_security_contributions` - Cotizaciones Seguridad Social
- `autonomous_communities_taxes` - Impuestos CCAA
- `eu_funds` - Fondos UE
- `other_revenues` - Otros Ingresos

### Gastos (Spending)
- `pensions` - Pensiones
- `social_security` - Seguridad Social
- `education` - Educación
- `healthcare` - Sanidad
- `defense` - Defensa
- `infrastructure` - Infraestructuras
- `public_administration` - Administración Pública
- `debt_interest` - Intereses de la Deuda
- `other_spending` - Otros Gastos

## Mapeo de Conceptos

El sistema intenta mapear automáticamente los conceptos de los CSV a nuestros tipos usando palabras clave. Si un concepto no se mapea correctamente, puedes:

1. Ajustar la función `mapConceptToType` en `dataService.ts`
2. Añadir más palabras clave para mejorar el mapeo

## Debugging

Para ver qué está pasando cuando se intentan obtener datos:

1. Revisa los logs del servidor cuando hagas una petición
2. Verás mensajes como:
   - `Fetching real budget data for year 2024...`
   - `Trying Ministerio de Hacienda CSV files...`
   - `✓ Successfully fetched X budget items from CSV`
   - O `⚠ No real data available from any source`

3. Si hay errores, aparecerán en los logs con detalles

## Próximos Pasos

1. **Probar con datos reales**: Intenta obtener datos de un año específico
2. **Ajustar el mapeo**: Si los datos se obtienen pero no se mapean correctamente, ajusta las funciones de mapeo
3. **Añadir más fuentes**: Puedes añadir más fuentes de datos según las necesites
4. **Cachear datos**: Considera cachear los datos obtenidos para evitar múltiples peticiones

## Notas Importantes

- Los datos reales pueden tardar más en cargar que los hardcodeados
- Algunas fuentes pueden tener límites de rate limiting
- Los formatos de datos pueden cambiar entre años
- Siempre verifica que los datos obtenidos sean correctos antes de usarlos en producción

