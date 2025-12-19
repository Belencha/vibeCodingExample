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
router.get('/summary/:year', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    
    // Try to get data from database first
    const [income, spending] = await Promise.all([
      BudgetItem.aggregate([
        { $match: { year, category: 'income' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      BudgetItem.aggregate([
        { $match: { year, category: 'spending' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
    ]);

    // If no data in database, return hardcoded sample data
    if (income.length === 0 && spending.length === 0) {
      const hardcodedData = getHardcodedBudgetData(year);
      return res.json(hardcodedData);
    }

    const totalIncome = income.reduce((sum, item) => sum + item.total, 0);
    const totalSpending = spending.reduce((sum, item) => sum + item.total, 0);

    res.json({
      year,
      income: {
        items: income,
        total: totalIncome,
      },
      spending: {
        items: spending,
        total: totalSpending,
      },
      balance: totalIncome - totalSpending,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching budget summary' });
  }
});

// Hardcoded sample data for prototype
function getHardcodedBudgetData(year: number) {
  // Spanish budget data (approximate values in millions of euros)
  // Based on 2023-2024 Spanish government budget estimates
  
  const incomeItems = [
    { _id: 'personal_income_tax', total: 95000 }, // IRPF
    { _id: 'corporate_tax', total: 28000 }, // Impuesto de Sociedades
    { _id: 'vat', total: 78000 }, // IVA
    { _id: 'social_security_contributions', total: 120000 }, // Cotizaciones Seguridad Social
    { _id: 'autonomous_communities_taxes', total: 45000 }, // Impuestos CCAA
    { _id: 'eu_funds', total: 35000 }, // Fondos UE
    { _id: 'other_revenues', total: 25000 }, // Otros ingresos
  ];

  const spendingItems = [
    { _id: 'pensions', total: 140000 }, // Pensiones
    { _id: 'social_security', total: 95000 }, // Seguridad Social (sanidad, desempleo)
    { _id: 'education', total: 52000 }, // Educación
    { _id: 'healthcare', total: 75000 }, // Sanidad
    { _id: 'defense', total: 12000 }, // Defensa
    { _id: 'infrastructure', total: 18000 }, // Infraestructuras
    { _id: 'public_administration', total: 35000 }, // Administración Pública
    { _id: 'debt_interest', total: 32000 }, // Intereses deuda
    { _id: 'other_spending', total: 28000 }, // Otros gastos
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
router.get('/years', async (req: Request, res: Response) => {
  try {
    const years = await BudgetItem.distinct('year');
    
    // If no years in database, return hardcoded years
    if (years.length === 0) {
      return res.json([2024, 2023, 2022, 2021, 2020]);
    }
    
    res.json(years.sort((a, b) => b - a));
  } catch (error) {
    res.status(500).json({ error: 'Error fetching years' });
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

