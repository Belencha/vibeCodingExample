/**
 * Service to fetch and process Spanish government budget data
 * 
 * Data sources:
 * - datos.gob.es (Spanish Open Data Portal)
 * - Ministerio de Hacienda (Ministry of Finance) - CSV files
 * - INE (National Statistics Institute) - JAXI API
 */

import axios from 'axios';
import { parse } from 'csv-parse/sync';

export interface BudgetDataSource {
  url: string;
  description: string;
  format: 'json' | 'csv' | 'xml';
}

export const DATA_SOURCES: BudgetDataSource[] = [
  {
    url: 'https://datos.gob.es/es/catalogo',
    description: 'Spanish Open Data Portal - Search for "presupuestos" or "gastos públicos"',
    format: 'json',
  },
  {
    url: 'https://www.sepg.pap.hacienda.gob.es/Presup/PGE2024/Liquidacion/csv/',
    description: 'Ministry of Finance - Budget execution data (CSV format)',
    format: 'csv',
  },
  {
    url: 'https://www.ine.es/jaxi/api/',
    description: 'INE - Public Administration Finance Statistics',
    format: 'json',
  },
];

/**
 * Get Ministerio de Hacienda CSV URL for a specific year
 */
function getHaciendaCSVUrl(year: number): string {
  // Ministerio de Hacienda CSV files structure
  // Example: https://www.sepg.pap.hacienda.gob.es/Presup/PGE2024/Liquidacion/csv/
  const baseUrl = 'https://www.sepg.pap.hacienda.gob.es/Presup';
  return `${baseUrl}/PGE${year}/Liquidacion/csv/`;
}

/**
 * Fetch CSV data from Ministerio de Hacienda
 * Tries multiple possible file names
 */
async function fetchHaciendaCSV(year: number): Promise<any[]> {
  const possibleFiles = [
    'liquidacion.csv',
    'liquidacion_presupuesto.csv',
    'presupuesto.csv',
    'gastos.csv',
    'ingresos.csv',
  ];

  for (const filename of possibleFiles) {
    try {
      const csvUrl = `${getHaciendaCSVUrl(year)}${filename}`;

      const response = await axios.get(csvUrl, {
        responseType: 'text',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BudgetApp/1.0)',
        },
      });

      if (response.data && response.data.length > 0) {
        const records = parse(response.data, {
          columns: true,
          skip_empty_lines: true,
          encoding: 'utf8',
        });

        if (records.length > 0) {
          console.log(`Successfully fetched CSV from ${csvUrl}`);
          return records;
        }
      }
    } catch (error: any) {
      // Continue to next file if this one fails
      if (error.response?.status !== 404) {
        console.log(`Tried ${filename}, got error: ${error.message}`);
      }
    }
  }

  return [];
}

/**
 * Try to fetch from datos.gob.es API
 */
async function fetchDatosGobES(year: number): Promise<any[]> {
  try {
    // datos.gob.es catalog API endpoint
    // Note: This is a generic endpoint - you'll need to find the specific dataset ID
    const catalogUrl = `https://datos.gob.es/apidata/catalog/dataset`;

    // Search for budget datasets
    const searchUrl = `${catalogUrl}?q=presupuestos+${year}`;

    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });

    // Process the catalog response to find relevant datasets
    // This is a simplified version - you may need to adjust based on actual API structure
    if (response.data && response.data.result) {
      console.log(`Found ${response.data.result.length} datasets in datos.gob.es`);
      // TODO: Process the catalog and fetch actual data
    }

    return [];
  } catch (error: any) {
    console.log(`Error fetching from datos.gob.es: ${error.message}`);
    return [];
  }
}

/**
 * Normalize CSV data to BudgetItem format
 * Handles different CSV column name variations
 */
function normalizeCSVData(csvRecords: any[], year: number): any[] {
  const budgetItems: any[] = [];

  if (!csvRecords || csvRecords.length === 0) {
    return [];
  }

  // Get column names (case-insensitive)
  const firstRecord = csvRecords[0];
  const columns = Object.keys(firstRecord);

  // Find amount column (try different possible names)
  const amountColumn = columns.find(col =>
    ['importe', 'amount', 'cantidad', 'valor', 'total', 'euros'].includes(col.toLowerCase())
  );

  // Find concept/description column
  const conceptColumn = columns.find(col =>
    ['concepto', 'concept', 'descripcion', 'description', 'nombre', 'name', 'tipo'].includes(col.toLowerCase())
  );

  // Find category/type column
  const categoryColumn = columns.find(col =>
    ['tipo', 'type', 'categoria', 'category', 'clase', 'clasificacion'].includes(col.toLowerCase())
  );

  csvRecords.forEach((record) => {
    try {
      // Try to extract amount from various column names
      let amountStr = '';
      if (amountColumn) {
        amountStr = String(record[amountColumn] || '');
      } else {
        // Try to find any numeric column
        for (const col of columns) {
          const value = String(record[col] || '');
          if (value.match(/[\d.,]+/)) {
            amountStr = value;
            break;
          }
        }
      }

      // Parse amount (handle Spanish number format: 1.234,56)
      const amount = parseAmount(amountStr);
      if (amount <= 0) return;

      // Determine category
      let category = 'spending'; // default
      if (categoryColumn) {
        const categoryValue = String(record[categoryColumn] || '').toLowerCase();
        if (categoryValue.includes('ingreso') || categoryValue.includes('revenue') || categoryValue.includes('income')) {
          category = 'income';
        } else if (categoryValue.includes('gasto') || categoryValue.includes('spending') || categoryValue.includes('expense')) {
          category = 'spending';
        }
      }

      // Get concept/description
      const concept = conceptColumn ? String(record[conceptColumn] || '') : '';

      // Map concept to our type
      const type = mapConceptToType(concept, category);

      if (type) {
        budgetItems.push({
          year,
          category,
          type,
          amount,
          description: concept || '',
        });
      }
    } catch (error) {
      // Skip records that can't be parsed
      console.log(`Skipping record due to parse error: ${error}`);
    }
  });

  return budgetItems;
}

/**
 * Parse amount string handling Spanish number format
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[€$£¥\s]/g, '');

  // Handle Spanish format: 1.234,56 (thousands separator: ., decimal: ,)
  // Or English format: 1,234.56 (thousands separator: ,, decimal: .)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Determine which is decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Spanish format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // English format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be decimal or thousands separator
    // If more than 3 digits after comma, it's probably thousands separator
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  } else {
    // Remove dots (thousands separator)
    cleaned = cleaned.replace(/\./g, '');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Map CSV concepts to our budget item types
 */
function mapConceptToType(concept: string, category: string): string | null {
  const conceptLower = concept.toLowerCase();

  if (category === 'income') {
    if (conceptLower.includes('irpf') || conceptLower.includes('renta')) return 'personal_income_tax';
    if (conceptLower.includes('sociedades') || conceptLower.includes('corporativo')) return 'corporate_tax';
    if (conceptLower.includes('iva')) return 'vat';
    if (conceptLower.includes('seguridad social') || conceptLower.includes('cotizaciones')) return 'social_security_contributions';
    if (conceptLower.includes('comunidad') || conceptLower.includes('autónoma')) return 'autonomous_communities_taxes';
    if (conceptLower.includes('ue') || conceptLower.includes('europa') || conceptLower.includes('fondo europeo')) return 'eu_funds';
    return 'other_revenues';
  } else {
    if (conceptLower.includes('pension')) return 'pensions';
    if (conceptLower.includes('seguridad social') || conceptLower.includes('sanidad') || conceptLower.includes('salud')) return 'social_security';
    if (conceptLower.includes('educación') || conceptLower.includes('educacion')) return 'education';
    if (conceptLower.includes('sanidad') || conceptLower.includes('salud')) return 'healthcare';
    if (conceptLower.includes('defensa') || conceptLower.includes('militar')) return 'defense';
    if (conceptLower.includes('infraestructura') || conceptLower.includes('obra pública')) return 'infrastructure';
    if (conceptLower.includes('administración') || conceptLower.includes('administracion')) return 'public_administration';
    if (conceptLower.includes('interés') || conceptLower.includes('interes') || conceptLower.includes('deuda')) return 'debt_interest';
    return 'other_spending';
  }
}

/**
 * Fetch budget data from Spanish government sources
 * Tries multiple sources in order of preference
 */
export async function fetchBudgetData(year: number): Promise<any[]> {
  console.log(`Fetching real budget data for year ${year}...`);

  try {
    // Strategy 1: Try Ministerio de Hacienda CSV files
    console.log('Trying Ministerio de Hacienda CSV files...');
    const csvData = await fetchHaciendaCSV(year);

    if (csvData.length > 0) {
      const normalized = normalizeCSVData(csvData, year);
      if (normalized.length > 0) {
        console.log(`✓ Successfully fetched ${normalized.length} budget items from CSV`);
        return normalized;
      }
    }

    // Strategy 2: Try datos.gob.es API
    console.log('Trying datos.gob.es API...');
    const datosGobData = await fetchDatosGobES(year);
    if (datosGobData.length > 0) {
      console.log(`✓ Successfully fetched ${datosGobData.length} budget items from datos.gob.es`);
      return datosGobData;
    }

    console.log('⚠ No real data available from any source');
    return [];
  } catch (error: any) {
    console.error('Error fetching budget data:', error.message);
    return [];
  }
}

/**
 * Process and normalize budget data from various sources
 */
export function normalizeBudgetData(rawData: any): any[] {
  // This function can be used to normalize data from different sources
  // For now, it's handled in fetchBudgetData
  return [];
}

