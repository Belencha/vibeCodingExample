import { Router, Request, Response } from 'express';
import BudgetItem from '../models/BudgetItem';
import { fetchBudgetData } from '../services/dataService';

const router = Router();

/**
 * @swagger
 * /api/budget:
 *   get:
 *     summary: Get all budget items
 *     tags: [Budget]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *         example: 2024
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [income, spending]
 *         description: Filter by category
 *         example: income
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *         example: personal_income_tax
 *     responses:
 *       200:
 *         description: List of budget items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BudgetItem'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all budget items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { year, category, type } = req.query;
    const query: any = {};

    if (year) query.year = parseInt(year as string);
    if (category) query.category = category;
    if (type) query.type = type;

    const items = await BudgetItem.find(query).sort({ year: -1, amount: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching budget data' });
  }
});

/**
 * @swagger
 * /api/budget/summary/{year}:
 *   get:
 *     summary: Get budget summary for a specific year
 *     tags: [Budget]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: The year to get budget summary for
 *         example: 2024
 *     responses:
 *       200:
 *         description: Budget summary for the year
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BudgetSummary'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get budget summary by year
router.get('/summary/:year', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);

    // Try to fetch real data first
    const realData = await fetchBudgetData(year);

    // If we have real data, process and return it
    if (realData.length > 0) {
      const incomeItems = realData
        .filter(item => item.category === 'income')
        .reduce((acc: any[], item) => {
          const existing = acc.find(i => i._id === item.type);
          if (existing) {
            existing.total += item.amount;
          } else {
            acc.push({ _id: item.type, total: item.amount });
          }
          return acc;
        }, []);

      const spendingItems = realData
        .filter(item => item.category === 'spending')
        .reduce((acc: any[], item) => {
          const existing = acc.find(i => i._id === item.type);
          if (existing) {
            existing.total += item.amount;
          } else {
            acc.push({ _id: item.type, total: item.amount });
          }
          return acc;
        }, []);

      const totalIncome = incomeItems.reduce((sum, item) => sum + item.total, 0);
      const totalSpending = spendingItems.reduce((sum, item) => sum + item.total, 0);

      return res.json({
        year,
        income: {
          items: incomeItems,
          total: totalIncome,
        },
        spending: {
          items: spendingItems,
          total: totalSpending,
        },
        balance: totalIncome - totalSpending,
        dataSource: 'real', // Indicate that this is real data
      });
    }

    // Fallback to hardcoded data if real data is not available
    const hardcodedData = getHardcodedBudgetData(year);
    return res.json({
      ...hardcodedData,
      dataSource: 'hardcoded', // Indicate that this is hardcoded data
    });

    /* MongoDB code (commented out for faster response with hardcoded data)
    const mongoose = require('mongoose');
    const isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      BudgetItem.aggregate([
        { $match: { year, category: 'income' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]).then((income) => {
        BudgetItem.aggregate([
          { $match: { year, category: 'spending' } },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ]).then((spending) => {
          if (income.length > 0 || spending.length > 0) {
            const totalIncome = income.reduce((sum, item) => sum + item.total, 0);
            const totalSpending = spending.reduce((sum, item) => sum + item.total, 0);
            return res.json({
              year,
              income: { items: income, total: totalIncome },
              spending: { items: spending, total: totalSpending },
              balance: totalIncome - totalSpending,
            });
          }
          // Fall through to hardcoded if no data
          const hardcodedData = getHardcodedBudgetData(year);
          res.json(hardcodedData);
        }).catch(() => {
          const hardcodedData = getHardcodedBudgetData(year);
          res.json(hardcodedData);
        });
      }).catch(() => {
        const hardcodedData = getHardcodedBudgetData(year);
        res.json(hardcodedData);
      });
    } else {
      const hardcodedData = getHardcodedBudgetData(year);
      res.json(hardcodedData);
    }
    */
  } catch (error) {
    console.error('Error in budget summary route:', error);
    res.status(500).json({ error: 'Error fetching budget summary', details: error.message });
  }
});

// Hardcoded sample data for prototype
function getHardcodedBudgetData(year: number) {
  // Spanish budget data (values in euros)
  // Based on 2023-2024 Spanish government budget estimates
  // Amounts are in billions, converted to full euros for display

  const incomeItems = [
    { _id: 'personal_income_tax', total: 95000000000 }, // IRPF - 95 billion
    { _id: 'corporate_tax', total: 28000000000 }, // Impuesto de Sociedades - 28 billion
    { _id: 'vat', total: 78000000000 }, // IVA - 78 billion
    { _id: 'social_security_contributions', total: 120000000000 }, // Cotizaciones - 120 billion
    { _id: 'autonomous_communities_taxes', total: 45000000000 }, // Impuestos CCAA - 45 billion
    { _id: 'eu_funds', total: 35000000000 }, // Fondos UE - 35 billion
    { _id: 'other_revenues', total: 25000000000 }, // Otros ingresos - 25 billion
  ];

  const spendingItems = [
    { _id: 'pensions', total: 140000000000 }, // Pensiones - 140 billion
    { _id: 'social_security', total: 95000000000 }, // Seguridad Social - 95 billion
    { _id: 'education', total: 52000000000 }, // Educación - 52 billion
    { _id: 'healthcare', total: 75000000000 }, // Sanidad - 75 billion
    { _id: 'defense', total: 12000000000 }, // Defensa - 12 billion
    { _id: 'infrastructure', total: 18000000000 }, // Infraestructuras - 18 billion
    { _id: 'public_administration', total: 35000000000 }, // Administración Pública - 35 billion
    { _id: 'debt_interest', total: 32000000000 }, // Intereses deuda - 32 billion
    { _id: 'other_spending', total: 28000000000 }, // Otros gastos - 28 billion
  ];

  const totalIncome = incomeItems.reduce((sum, item) => sum + item.total, 0);
  const totalSpending = spendingItems.reduce((sum, item) => sum + item.total, 0);

  return {
    year,
    income: {
      items: incomeItems,
      total: totalIncome,
    },
    spending: {
      items: spendingItems,
      total: totalSpending,
    },
    balance: totalIncome - totalSpending,
    dataSource: 'hardcoded', // This function returns hardcoded data
  }
}

/**
 * @swagger
 * /api/budget/years:
 *   get:
 *     summary: Get all available years
 *     tags: [Budget]
 *     responses:
 *       200:
 *         description: List of available years
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: integer
 *               example: [2024, 2023, 2022, 2021, 2020]
 */
// Get available years
router.get('/years', async (req: Request, res: Response) => {
  try {
    // First, try to get years from CSV files
    const fs = require('fs');
    const path = require('path');
    const { parse } = require('csv-parse/sync');

    const dataDir = path.join(__dirname, '../../data/csv');
    const yearColumnFiles = ['ingresos.csv', 'gastos.csv'];
    const yearsSet = new Set<number>();

    // Read years from CSV files
    for (const filename of yearColumnFiles) {
      try {
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            encoding: 'utf8',
          });

          if (records.length > 0) {
            const columns = Object.keys(records[0]);
            // Extract year columns (format: 2016, 2017, 2023-P, etc.)
            columns.slice(1).forEach((col: string) => {
              const yearMatch = col.match(/^(\d{4})/);
              if (yearMatch) {
                const year = parseInt(yearMatch[1]);
                if (!isNaN(year)) {
                  yearsSet.add(year);
                }
              }
            });
          }
        }
      } catch (error) {
        // Continue to next file
      }
    }

    // If we found years in CSV files, return them
    if (yearsSet.size > 0) {
      const years = Array.from(yearsSet).sort((a, b) => b - a);
      return res.json(years);
    }

    // Otherwise, check MongoDB
    const mongoose = require('mongoose');
    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
      BudgetItem.distinct('year')
        .then((years) => {
          if (years.length > 0) {
            return res.json(years.sort((a, b) => b - a));
          }
          // No years in DB, return hardcoded
          res.json([2024, 2023, 2022, 2021, 2020]);
        })
        .catch(() => {
          // Database query failed, return hardcoded years
          res.json([2024, 2023, 2022, 2021, 2020]);
        });
    } else {
      // MongoDB not connected, return hardcoded years
      res.json([2024, 2023, 2022, 2021, 2020]);
    }
  } catch (error) {
    console.error('Error in years route:', error);
    // Even if there's an error, return hardcoded years
    res.json([2024, 2023, 2022, 2021, 2020]);
  }
});

/**
 * @swagger
 * /api/budget:
 *   post:
 *     summary: Create a new budget item
 *     tags: [Budget]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - category
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2024
 *               category:
 *                 type: string
 *                 enum: [income, spending]
 *                 example: income
 *               type:
 *                 type: string
 *                 example: personal_income_tax
 *               amount:
 *                 type: number
 *                 example: 95000000000
 *               description:
 *                 type: string
 *                 example: Personal Income Tax (IRPF)
 *               source:
 *                 type: string
 *                 example: https://example.com/data
 *     responses:
 *       201:
 *         description: Budget item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BudgetItem'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Create/update budget item
router.post('/', async (req: Request, res: Response) => {
  try {
    const budgetItem = new BudgetItem(req.body);
    await budgetItem.save();
    res.status(201).json(budgetItem);
  } catch (error) {
    res.status(400).json({ error: 'Error creating budget item' });
  }
});

export default router;

