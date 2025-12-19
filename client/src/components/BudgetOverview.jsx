import React, { useState, useEffect, useCallback } from 'react';
import './BudgetOverview.css';

const BudgetOverview = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);

    const fetchAvailableYears = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:5000/api/budget/years');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const years = await response.json();
            setAvailableYears(years);
            if (years.length > 0) {
                setYear((prevYear) => prevYear || years[0]);
            }
        } catch (err) {
            console.error('Error fetching years:', err);
            // Set default years if API fails
            setAvailableYears([2024, 2023, 2022, 2021, 2020]);
            setYear((prevYear) => prevYear || 2024);
        }
    }, []);

    useEffect(() => {
        fetchAvailableYears();
    }, [fetchAvailableYears]);

    useEffect(() => {
        if (year) {
            fetchBudgetSummary(year);
        }
    }, [year]);

    const fetchBudgetSummary = async (selectedYear) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:5000/api/budget/summary/${selectedYear}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setSummary(data);
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch budget data. Make sure the server is running on port 5000.';
            setError(errorMessage);
            console.error('Error fetching budget summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatCategoryName = (type) => {
        const names = {
            personal_income_tax: 'Personal Income Tax (IRPF)',
            corporate_tax: 'Corporate Tax',
            vat: 'VAT (IVA)',
            social_security_contributions: 'Social Security Contributions',
            autonomous_communities_taxes: 'Autonomous Communities Taxes',
            eu_funds: 'EU Funds',
            other_revenues: 'Other Revenues',
            pensions: 'Pensions',
            social_security: 'Social Security',
            education: 'Education',
            healthcare: 'Healthcare',
            defense: 'Defense',
            infrastructure: 'Infrastructure',
            public_administration: 'Public Administration',
            debt_interest: 'Debt Interest',
            other_spending: 'Other Spending',
        };
        return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return <div className="budget-overview">Loading budget data...</div>;
    }

    if (error) {
        return <div className="budget-overview error">Error: {error}</div>;
    }

    return (
        <div className="budget-overview">
            <div className="budget-header">
                <h1>Spanish Government Budget</h1>
                <div className="year-selector">
                    <label htmlFor="year-select">Year: </label>
                    <select
                        id="year-select"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {summary && (
                <div className="budget-summary">
                    <div className="budget-section income">
                        <h2>Income (Ingresos)</h2>
                        <div className="total-amount income-total">
                            Total: {formatCurrency(summary.income.total)}
                        </div>
                        <div className="budget-items">
                            {summary.income.items.map((item, index) => (
                                <div key={index} className="budget-item">
                                    <span className="item-type">{formatCategoryName(item._id)}</span>
                                    <span className="item-amount">{formatCurrency(item.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="budget-section spending">
                        <h2>Spending (Gastos)</h2>
                        <div className="total-amount spending-total">
                            Total: {formatCurrency(summary.spending.total)}
                        </div>
                        <div className="budget-items">
                            {summary.spending.items.map((item, index) => (
                                <div key={index} className="budget-item">
                                    <span className="item-type">{formatCategoryName(item._id)}</span>
                                    <span className="item-amount">{formatCurrency(item.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="budget-balance">
                        <h2>Balance</h2>
                        <div className={`balance-amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(summary.balance)}
                        </div>
                        {summary.balance < 0 && (
                            <p className="deficit-warning">Budget Deficit</p>
                        )}
                    </div>
                </div>
            )}

            {!summary && !loading && (
                <div className="no-data">
                    <p>No budget data available for {year}.</p>
                    <p>Add data using the API or import from government sources.</p>
                </div>
            )}
        </div>
    );
};

export default BudgetOverview;

