# Spanish Government Budget Data Sources

This document outlines where to find Spanish government financial data for the application.

## Official Data Sources

### 1. **datos.gob.es** (Spanish Open Data Portal)
- **URL**: https://datos.gob.es
- **Description**: Central portal for Spanish open data
- **Search terms**: "presupuestos", "gastos públicos", "ingresos públicos", "Presupuestos Generales del Estado"
- **Format**: JSON, CSV, XML
- **API**: Some datasets have REST APIs

### 2. **Ministerio de Hacienda** (Ministry of Finance)
- **URL**: https://www.sepg.pap.hacienda.gob.es
- **Description**: Official budget and public accounting data
- **Data available**:
  - Presupuestos Generales del Estado (General State Budget)
  - Liquidación de Presupuestos (Budget Execution)
  - CSV and Excel files available
- **Example**: https://www.sepg.pap.hacienda.gob.es/Presup/PGE2024/Liquidacion/csv/

### 3. **INE** (Instituto Nacional de Estadística)
- **URL**: https://www.ine.es
- **Description**: National Statistics Institute
- **Relevant data**:
  - Public Administration Finance Statistics
  - Government spending by category
  - Tax revenue statistics
- **API**: JAXI API available for some datasets

### 4. **Tesoro Público** (Public Treasury)
- **URL**: https://www.tesoro.es
- **Description**: Treasury and public debt information
- **Data**: Public debt, financing, treasury operations

### 5. **European Data Portal**
- **URL**: https://data.europa.eu
- **Description**: EU funding and financial data
- **Relevant**: EU funds received by Spain

## Data Categories

### Spending Categories
- **Pensions** (Pensiones): Retirement pensions, disability pensions
- **Social Security** (Seguridad Social): Healthcare, unemployment benefits
- **Education**: Public education spending
- **Healthcare**: Public health system
- **Defense**: Military spending
- **Infrastructure**: Public works, transportation
- **Public Administration**: Government operations
- **Debt Interest**: Interest on public debt

### Income Categories
- **Personal Income Tax** (IRPF): Taxes from individuals
- **Corporate Tax** (Impuesto de Sociedades): Taxes from companies
- **VAT** (IVA): Value Added Tax
- **Autonomous Communities Taxes**: Regional taxes
- **EU Funds**: European Union funding
- **Foreign Investment**: Direct foreign investment
- **Other Revenues**: Various other income sources

## Implementation Steps

1. **Explore datos.gob.es API**
   - Search for budget datasets
   - Check if they have REST API endpoints
   - Register for API keys if needed

2. **Download and Process CSV Files**
   - Download budget execution files from Ministerio de Hacienda
   - Parse CSV files
   - Normalize data structure

3. **Use INE JAXI API**
   - Access statistical data programmatically
   - Parse JSON responses

4. **Data Normalization**
   - Convert all data to common format (BudgetItem model)
   - Handle different currencies, units, and time periods
   - Validate and clean data

## Example API Endpoints to Check

- `https://datos.gob.es/apidata/catalog/dataset` - Catalog API
- `https://www.ine.es/jaxi/api/` - INE JAXI API
- Ministerio de Hacienda CSV files (direct download)

## Next Steps

1. Manually explore datos.gob.es to find specific dataset IDs
2. Test API endpoints and authentication requirements
3. Create data fetching scripts
4. Implement data processing and storage
5. Build frontend visualization components

