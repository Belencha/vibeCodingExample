import { Router, Request, Response } from 'express';
import BudgetItem from '../models/BudgetItem';

const router = Router();

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

// Get budget summary by year
router.get('/summary/:year', (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    
    // Return hardcoded data immediately - no MongoDB check to avoid delays
    // If you want to use MongoDB later, uncomment the database code below
    const hardcodedData = getHardcodedBudgetData(year);
    return res.json(hardcodedData);
    
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
    }
}

// Get available years
router.get('/years', (req: Request, res: Response) => {
  try {
    // Check if MongoDB is connected quickly
    const mongoose = require('mongoose');
    const isConnected = mongoose.connection.readyState === 1;
    
    // Only try database if connected, otherwise return hardcoded years immediately
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
      // MongoDB not connected, return hardcoded years immediately
      res.json([2024, 2023, 2022, 2021, 2020]);
    }
  } catch (error) {
    console.error('Error in years route:', error);
    // Even if there's an error, return hardcoded years
    res.json([2024, 2023, 2022, 2021, 2020]);
  }
});

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

