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

// Get available years
router.get('/years', async (req: Request, res: Response) => {
  try {
    const years = await BudgetItem.distinct('year');
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

