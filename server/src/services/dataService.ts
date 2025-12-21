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
import * as fs from 'fs';
import * as path from 'path';

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
 * Process CSV files where first column is concept and other columns are years
 * Format: Concepto,2016,2017,2018,...
 */
function processYearColumnsCSV(csvRecords: any[], category: 'income' | 'spending'): any[] {
  const budgetItems: any[] = [];

  if (!csvRecords || csvRecords.length === 0) {
    return [];
  }

  // Get all columns
  const firstRecord = csvRecords[0];
  const columns = Object.keys(firstRecord);
  
  // First column should be the concept (Capítulos, Políticas, etc.)
  // Find the concept column - it should be the first non-numeric column
  let conceptColumn = columns[0];
  
  // If the first column looks like a year, try to find a better concept column
  if (/^\d{4}/.test(conceptColumn)) {
    // Look for a column that doesn't look like a year
    const nonYearColumn = columns.find(col => !/^\d{4}/.test(col));
    if (nonYearColumn) {
      conceptColumn = nonYearColumn;
    }
  }
  
  console.log(`   All columns: ${columns.join(', ')}`);
  console.log(`   Using concept column: "${conceptColumn}"`);

  // Other columns should be years (numeric)
  const yearColumns = columns.slice(1).filter(col => {
    // Check if column name is a year (4 digits) or year with suffix (like "2023-P")
    return /^\d{4}(-P)?$/.test(col);
  });

  console.log(`   Concept column: ${conceptColumn}`);
  console.log(`   Year columns found: ${yearColumns.join(', ')}`);
  console.log(`   First record sample:`, JSON.stringify(firstRecord, null, 2));

  csvRecords.forEach((record, recordIndex) => {
    // Get the concept from the first column
    const concept = String(record[conceptColumn] || '').trim();
    
    // Debug first few records
    if (recordIndex < 3) {
      console.log(`   Record ${recordIndex}: conceptColumn="${conceptColumn}", concept="${concept}"`);
      console.log(`   Full record:`, JSON.stringify(record, null, 2));
    }
    
    // Skip if:
    // - Empty concept
    // - Concept is the column name itself (header row)
    // - Concept contains "total" (case insensitive)
    // - Concept is purely numeric (a value, not a description)
    if (!concept || 
        concept === conceptColumn || 
        concept.toLowerCase().includes('total') || 
        /^\d+\.?\d*$/.test(concept)) {
      if (recordIndex < 3) {
        console.log(`   ⚠ Skipping record ${recordIndex}: concept="${concept}" (empty/header/total/numeric)`);
      }
      return;
    }

    // Process each year column
    yearColumns.forEach((yearCol) => {
      const yearStr = yearCol.split('-')[0]; // Remove suffix like "-P"
      const year = parseInt(yearStr);

      if (isNaN(year)) {
        return;
      }

      const amountStr = String(record[yearCol] || '').trim();
      if (!amountStr) {
        return;
      }

      // Parse amount - values are in millions with dot as decimal separator
      // Example: "209880.90" means 209,880.90 millions = 209,880,900,000 euros
      let cleaned = amountStr.replace(/[€$£¥\s]/g, '').trim();

      // The CSV uses dot as decimal separator (English format)
      // "209880.90" should be parsed as 209880.90
      let amount = parseFloat(cleaned);

      if (isNaN(amount) || amount <= 0) {
        return;
      }

      // Convert from millions to euros
      amount = amount * 1000000;

      // Use concept as unique identifier (each CSV row is a separate budget item)
      // Create a slug from the concept for use as _id
      const conceptSlug = concept
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Map concept to a type for categorization (optional, for filtering)
      const type = mapConceptToType(concept, category) || 'other_' + (category === 'income' ? 'revenues' : 'spending');

      // Final validation: ensure concept is not numeric and is a valid description
      if (!concept || /^\d+\.?\d*$/.test(concept) || concept.length < 3) {
        console.warn(`   ⚠ Skipping item with invalid concept: "${concept}" (record index: ${recordIndex}, year: ${year})`);
        return;
      }

      // Double-check: concept should not be a year or numeric value
      if (/^\d{4}/.test(concept) || parseFloat(concept).toString() === concept) {
        console.warn(`   ⚠ Skipping item - concept appears to be numeric/year: "${concept}"`);
        return;
      }

      budgetItems.push({
        year,
        category,
        type, // Keep type for backward compatibility and filtering
        amount,
        description: concept, // Full description from CSV (e.g., "Impuestos directos")
        conceptId: conceptSlug, // Unique identifier for this concept
      });
      
      // Debug first few items
      if (budgetItems.length <= 3) {
        console.log(`   Created item: description="${concept}", amount=${amount}, year=${year}`);
      }
    });
  });

  return budgetItems;
}

/**
 * Try to read CSV from local files first
 * Handles both traditional format and year-columns format
 */
function readLocalCSV(year: number): any[] {
  const dataDir = path.join(__dirname, '../../data/csv');

  // First, try to read ingresos.csv and gastos.csv (year-columns format)
  const yearColumnFiles = ['ingresos.csv', 'gastos.csv'];
  const yearColumnData: any[] = [];

  for (const filename of yearColumnFiles) {
    try {
      const filePath = path.join(dataDir, filename);
      if (fs.existsSync(filePath)) {
        console.log(`📁 Reading local CSV file: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        if (fileContent && fileContent.length > 0) {
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            encoding: 'utf8',
          });

          if (records.length > 0) {
            console.log(`✓ Successfully read ${records.length} records from local file: ${filename}`);
            console.log(`   First record keys:`, Object.keys(records[0]));
            console.log(`   First record sample:`, JSON.stringify(records[0], null, 2));
            const category = filename.includes('ingresos') ? 'income' : 'spending';
            const processed = processYearColumnsCSV(records, category);
            console.log(`   Processed ${processed.length} items, first item:`, processed[0] ? JSON.stringify(processed[0], null, 2) : 'none');
            yearColumnData.push(...processed);
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠ Error reading local file ${filename}: ${error.message}`);
    }
  }

  // If we got data from year-columns format, return it
  if (yearColumnData.length > 0) {
    console.log(`✓ Processed ${yearColumnData.length} budget items from year-columns CSV files`);
    return yearColumnData;
  }

  // Otherwise, try traditional format files
  const possibleFiles = [
    `${year}_liquidacion.csv`,
    `${year}_liquidacion_presupuesto.csv`,
    `${year}_presupuesto.csv`,
    `${year}_gastos.csv`,
    `${year}_ingresos.csv`,
    'liquidacion.csv',
    'presupuesto.csv',
  ];

  for (const filename of possibleFiles) {
    try {
      const filePath = path.join(dataDir, filename);
      if (fs.existsSync(filePath)) {
        console.log(`📁 Reading local CSV file: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        if (fileContent && fileContent.length > 0) {
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            encoding: 'utf8',
          });

          if (records.length > 0) {
            console.log(`✓ Successfully read ${records.length} records from local file: ${filename}`);
            return records;
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠ Error reading local file ${filename}: ${error.message}`);
    }
  }

  return [];
}

/**
 * Fetch CSV data from Ministerio de Hacienda
 * Tries multiple possible file names
 */
async function fetchHaciendaCSV(year: number): Promise<any[]> {
  // First, try to read from local files
  const localData = readLocalCSV(year);

  // If we got processed data (from year-columns format), return it directly
  if (localData.length > 0 && localData[0].year !== undefined) {
    // This is already processed data, filter by year if needed
    const filtered = localData.filter((item: any) => item.year === year);
    if (filtered.length > 0) {
      return filtered;
    }
    // If no data for this year, return all data (the route will handle filtering)
    return localData;
  }

  // Otherwise, this is raw CSV data that needs normalization
  if (localData.length > 0) {
    return localData;
  }

  // If no local files, try to download from URL
  console.log(`🌐 No local CSV files found, trying to download from Ministerio de Hacienda...`);
  const possibleFiles = [
    'liquidacion.csv',
    'liquidacion_presupuesto.csv',
    'presupuesto.csv',
    'gastos.csv',
    'ingresos.csv',
  ];

  const baseUrl = getHaciendaCSVUrl(year);
  console.log(`   Base URL: ${baseUrl}`);

  for (const filename of possibleFiles) {
    try {
      const csvUrl = `${baseUrl}${filename}`;
      console.log(`   Trying: ${csvUrl}`);

      const response = await axios.get(csvUrl, {
        responseType: 'text',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.data && response.data.length > 0) {
        console.log(`   ✓ Got response (${response.data.length} bytes)`);
        const records = parse(response.data, {
          columns: true,
          skip_empty_lines: true,
          encoding: 'utf8',
        });

        if (records.length > 0) {
          console.log(`✓ Successfully fetched ${records.length} records from ${csvUrl}`);
          console.log(`   Sample columns: ${Object.keys(records[0]).join(', ')}`);
          return records;
        } else {
          console.log(`   ⚠ File downloaded but no records parsed`);
        }
      }
    } catch (error: any) {
      // Log detailed error information
      if (error.response) {
        console.log(`   ✗ ${filename}: HTTP ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        console.log(`   ✗ ${filename}: No response received (timeout or network error)`);
      } else {
        console.log(`   ✗ ${filename}: ${error.message}`);
      }
    }
  }

  console.log(`⚠ Could not fetch CSV from any URL`);
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
    console.log('⚠ No CSV records to normalize');
    return [];
  }

  // Get column names (case-insensitive)
  const firstRecord = csvRecords[0];
  const columns = Object.keys(firstRecord);
  console.log(`📊 CSV columns found: ${columns.join(', ')}`);
  console.log(`📊 Sample record:`, JSON.stringify(firstRecord, null, 2));

  // Find amount column (try different possible names)
  const amountColumn = columns.find(col =>
    ['importe', 'amount', 'cantidad', 'valor', 'total', 'euros', 'liquidado', 'ejecutado', 'presupuestado'].includes(col.toLowerCase())
  );

  // Find concept/description column
  const conceptColumn = columns.find(col =>
    ['concepto', 'concept', 'descripcion', 'description', 'nombre', 'name', 'tipo', 'denominacion', 'capitulo'].includes(col.toLowerCase())
  );

  // Find category/type column
  const categoryColumn = columns.find(col =>
    ['tipo', 'type', 'categoria', 'category', 'clase', 'clasificacion', 'naturaleza'].includes(col.toLowerCase())
  );

  console.log(`   Amount column: ${amountColumn || 'NOT FOUND'}`);
  console.log(`   Concept column: ${conceptColumn || 'NOT FOUND'}`);
  console.log(`   Category column: ${categoryColumn || 'NOT FOUND'}`);

  let processedCount = 0;
  let skippedCount = 0;

  csvRecords.forEach((record, index) => {
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
      if (amount <= 0) {
        skippedCount++;
        return;
      }

      // Determine category - try multiple strategies
      let category = 'spending'; // default

      // Strategy 1: Check category column
      if (categoryColumn) {
        const categoryValue = String(record[categoryColumn] || '').toLowerCase();
        if (categoryValue.includes('ingreso') || categoryValue.includes('revenue') || categoryValue.includes('income') || categoryValue.includes('i')) {
          category = 'income';
        } else if (categoryValue.includes('gasto') || categoryValue.includes('spending') || categoryValue.includes('expense') || categoryValue.includes('g')) {
          category = 'spending';
        }
      }

      // Strategy 2: Check if filename or URL suggests category
      // Strategy 3: Infer from concept/description
      const concept = conceptColumn ? String(record[conceptColumn] || '') : '';
      const conceptLower = concept.toLowerCase();

      // If we still don't know, try to infer from concept
      if (category === 'spending' && !categoryColumn) {
        if (conceptLower.includes('ingreso') || conceptLower.includes('revenue') || conceptLower.includes('impuesto') || conceptLower.includes('tributo')) {
          category = 'income';
        }
      }

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
        processedCount++;
      } else {
        skippedCount++;
        if (index < 5) {
          console.log(`   Skipped record ${index}: concept="${concept}", category="${category}"`);
        }
      }
    } catch (error: any) {
      // Skip records that can't be parsed
      skippedCount++;
      if (index < 5) {
        console.log(`   Error parsing record ${index}: ${error.message}`);
      }
    }
  });

  console.log(`✓ Normalized ${processedCount} budget items (skipped ${skippedCount})`);
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
    // Direct taxes
    if (conceptLower.includes('impuestos directos') || conceptLower.includes('irpf') || conceptLower.includes('renta')) {
      return 'personal_income_tax';
    }
    // Corporate tax
    if (conceptLower.includes('sociedades') || conceptLower.includes('corporativo')) {
      return 'corporate_tax';
    }
    // Indirect taxes (VAT)
    if (conceptLower.includes('impuestos indirectos') || conceptLower.includes('iva')) {
      return 'vat';
    }
    // Social security contributions
    if (conceptLower.includes('seguridad social') || conceptLower.includes('cotizaciones')) {
      return 'social_security_contributions';
    }
    // Autonomous communities
    if (conceptLower.includes('comunidad') || conceptLower.includes('autónoma') || conceptLower.includes('territorial')) {
      return 'autonomous_communities_taxes';
    }
    // EU funds
    if (conceptLower.includes('ue') || conceptLower.includes('europa') || conceptLower.includes('fondo europeo')) {
      return 'eu_funds';
    }
    // Other revenues (fees, transfers, etc.)
    if (conceptLower.includes('tasas') || conceptLower.includes('precios') || conceptLower.includes('transferencias') ||
      conceptLower.includes('patrimoniales') || conceptLower.includes('enajenación')) {
      return 'other_revenues';
    }
    // Default for income
    return 'other_revenues';
  } else {
    // Pensions
    if (conceptLower.includes('pension')) {
      return 'pensions';
    }
    // Social security / Healthcare
    if (conceptLower.includes('seguridad social') || conceptLower.includes('sanidad') || conceptLower.includes('salud')) {
      return 'social_security';
    }
    // Education
    if (conceptLower.includes('educación') || conceptLower.includes('educacion')) {
      return 'education';
    }
    // Healthcare (separate from social security)
    if (conceptLower.includes('sanidad') || conceptLower.includes('salud')) {
      return 'healthcare';
    }
    // Defense
    if (conceptLower.includes('defensa') || conceptLower.includes('militar')) {
      return 'defense';
    }
    // Infrastructure
    if (conceptLower.includes('infraestructura') || conceptLower.includes('infraestructuras') || conceptLower.includes('obra pública')) {
      return 'infrastructure';
    }
    // Public administration
    if (conceptLower.includes('administración') || conceptLower.includes('administracion') ||
      conceptLower.includes('personal') || conceptLower.includes('bienes y servicios')) {
      return 'public_administration';
    }
    // Debt interest
    if (conceptLower.includes('interés') || conceptLower.includes('interes') || conceptLower.includes('deuda') ||
      conceptLower.includes('gastos financieros') || conceptLower.includes('deuda pública')) {
      return 'debt_interest';
    }
    // Other spending
    if (conceptLower.includes('transferencias') || conceptLower.includes('contingencia') ||
      conceptLower.includes('inversiones') || conceptLower.includes('desempleo') ||
      conceptLower.includes('prestaciones') || conceptLower.includes('servicios sociales')) {
      return 'other_spending';
    }
    // Default for spending
    return 'other_spending';
  }
}

/**
 * Fetch budget data from Spanish government sources
 * Tries multiple sources in order of preference
 */
export async function fetchBudgetData(year: number): Promise<any[]> {
  console.log(`\n🔍 Fetching real budget data for year ${year}...`);

  try {
    // Strategy 1: Try Ministerio de Hacienda CSV files (local first, then remote)
    console.log('\n📥 Strategy 1: Ministerio de Hacienda CSV files');
    const csvData = await fetchHaciendaCSV(year);

    if (csvData.length > 0) {
      // Check if data is already processed (has year, category, type properties)
      const isProcessed = csvData[0] && csvData[0].year !== undefined && csvData[0].category !== undefined;

      if (isProcessed) {
        // Data is already processed, filter by year and return
        const filtered = csvData.filter((item: any) => item.year === year);
        console.log(`✅ Found ${filtered.length} budget items for year ${year} (from ${csvData.length} total items)\n`);
        return filtered;
      } else {
        // Data needs normalization
        console.log(`   Found ${csvData.length} raw CSV records`);
        const normalized = normalizeCSVData(csvData, year);
        if (normalized.length > 0) {
          console.log(`✅ Successfully fetched ${normalized.length} budget items from CSV\n`);
          return normalized;
        } else {
          console.log(`   ⚠ CSV data found but could not normalize any records\n`);
        }
      }
    } else {
      console.log(`   ⚠ No CSV data found\n`);
    }

    // Strategy 2: Try datos.gob.es API
    console.log('📥 Strategy 2: datos.gob.es API');
    const datosGobData = await fetchDatosGobES(year);
    if (datosGobData.length > 0) {
      console.log(`✅ Successfully fetched ${datosGobData.length} budget items from datos.gob.es\n`);
      return datosGobData;
    } else {
      console.log(`   ⚠ No data from datos.gob.es\n`);
    }

    console.log('⚠ No real data available from any source - will use hardcoded data\n');
    return [];
  } catch (error: any) {
    console.error(`❌ Error fetching budget data: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
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

