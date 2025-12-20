# Archivos CSV Locales

Coloca aquí los archivos CSV del presupuesto que quieras usar localmente.

## Nombres de archivos soportados

El sistema buscará archivos con estos nombres (en orden de prioridad):

1. `ingresos.csv`
2. `gastos.csv`
3. `gastos_politicas.csv`
4. `gastos_programas.csv`
5. `gastos_subsectores.csv`
6. `transferencias.csv`
7. `transferencias_corrientes.csv`
8. `transferencias_inversiones.csv`

## Cómo obtener los archivos

1. Visita https://www.sepg.pap.hacienda.gob.es
2. Navega a los Presupuestos Generales del Estado del año que necesites
3. Busca la sección de "Estadísticasa" y descárgate el excel.
4. Con ayuda de una IA extrae cada hoja del excel en un CSV
5. Descarga los archivos CSV disponibles
6. Colócalos en esta carpeta con uno de los nombres soportados

## Formato esperado

El CSV debe tener columnas que contengan:
- **Importe/Cantidad**: Una columna con valores numéricos (puede llamarse: `importe`, `amount`, `cantidad`, `valor`, `total`, `euros`, `liquidado`, `ejecutado`, `presupuestado`)
- **Concepto/Descripción**: Una columna con descripciones (puede llamarse: `concepto`, `concept`, `descripcion`, `description`, `nombre`, `name`, `tipo`, `denominacion`, `capitulo`)
- **Categoría (opcional)**: Una columna que indique si es ingreso o gasto (puede llamarse: `tipo`, `type`, `categoria`, `category`, `clase`, `clasificacion`, `naturaleza`)

## Ejemplo

Si tienes un archivo CSV del presupuesto de 2024, puedes nombrarlo:
- `2024_liquidacion.csv`
- `2024_presupuesto.csv`
- O simplemente `liquidacion.csv` si solo tienes un año

El sistema intentará primero leer archivos locales antes de intentar descargarlos desde internet.

