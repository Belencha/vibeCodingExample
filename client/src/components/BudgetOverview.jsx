import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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
            const errorMessage = err.message || 'Error al cargar los datos del presupuesto. Asegúrate de que el servidor esté ejecutándose en el puerto 5000.';
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
            personal_income_tax: 'Impuesto sobre la Renta de las Personas Físicas (IRPF)',
            corporate_tax: 'Impuesto de Sociedades',
            vat: 'Impuesto sobre el Valor Añadido (IVA)',
            social_security_contributions: 'Cotizaciones a la Seguridad Social',
            autonomous_communities_taxes: 'Impuestos de las Comunidades Autónomas',
            eu_funds: 'Fondos de la Unión Europea',
            other_revenues: 'Otros Ingresos',
            pensions: 'Pensiones',
            social_security: 'Seguridad Social',
            education: 'Educación',
            healthcare: 'Sanidad',
            defense: 'Defensa',
            infrastructure: 'Infraestructuras',
            public_administration: 'Administración Pública',
            debt_interest: 'Intereses de la Deuda',
            other_spending: 'Otros Gastos',
        };
        return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Prepare data for pie charts
    const prepareChartData = (items, total) => {
        return items.map((item) => ({
            name: formatCategoryName(item._id),
            value: item.total,
            percentage: ((item.total / total) * 100).toFixed(1),
        }));
    };

    // Colors for pie charts
    const COLORS_INCOME = ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#e8f5e9', '#f1f8e9'];
    const COLORS_SPENDING = ['#f44336', '#e57373', '#ef5350', '#e91e63', '#f06292', '#ba68c8', '#9575cd', '#7986cb', '#64b5f6'];

    if (loading) {
        return (
            <div className="budget-overview">
                <div className="loader-container">
                    <div className="loader"></div>
                    <p>Cargando datos del presupuesto...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="budget-overview error">Error: {error}</div>;
    }

    return (
        <div className="budget-overview">
            <div className="budget-header">
                <h1>Presupuesto del Estado Español</h1>
                <div className="year-selector">
                    <label htmlFor="year-select">Año: </label>
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

            {summary && summary.dataSource && (
                <div className={`data-source-indicator ${summary.dataSource === 'real' ? 'real' : 'hardcoded'}`}>
                    {summary.dataSource === 'real' ? (
                        <span>✓ Datos reales del gobierno</span>
                    ) : (
                        <span>⚠ Datos de demostración (hardcoded)</span>
                    )}
                </div>
            )}

            {summary && (
                <div className="budget-summary">
                    <div className="budget-section income">
                        <h2>Ingresos</h2>
                        <div className="total-amount income-total">
                            Total: {formatCurrency(summary.income.total)}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={prepareChartData(summary.income.items, summary.income.total)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ percentage }) => percentage > 5 ? `${percentage}%` : ''}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {prepareChartData(summary.income.items, summary.income.total).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_INCOME[index % COLORS_INCOME.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="budget-items">
                            {summary.income.items.map((item, index) => {
                                const percentage = ((item.total / summary.income.total) * 100).toFixed(1);
                                return (
                                    <div key={index} className="budget-item">
                                        <span className="item-type">{formatCategoryName(item._id)}</span>
                                        <span className="item-details">
                                            <span className="item-amount">{formatCurrency(item.total)}</span>
                                            <span className="item-percentage">({percentage}%)</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="budget-section spending">
                        <h2>Gastos</h2>
                        <div className="total-amount spending-total">
                            Total: {formatCurrency(summary.spending.total)}
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={prepareChartData(summary.spending.items, summary.spending.total)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ percentage }) => percentage > 5 ? `${percentage}%` : ''}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {prepareChartData(summary.spending.items, summary.spending.total).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_SPENDING[index % COLORS_SPENDING.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="budget-items">
                            {summary.spending.items.map((item, index) => {
                                const percentage = ((item.total / summary.spending.total) * 100).toFixed(1);
                                return (
                                    <div key={index} className="budget-item">
                                        <span className="item-type">{formatCategoryName(item._id)}</span>
                                        <span className="item-details">
                                            <span className="item-amount">{formatCurrency(item.total)}</span>
                                            <span className="item-percentage">({percentage}%)</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="budget-balance">
                        <h2>Balance Presupuestario</h2>
                        <div className={`balance-amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(summary.balance)}
                        </div>
                        {summary.balance < 0 && (
                            <p className="deficit-warning">Déficit Presupuestario</p>
                        )}
                        {summary.balance >= 0 && (
                            <p className="surplus-info">Superávit Presupuestario</p>
                        )}
                    </div>
                </div>
            )}

            {!summary && !loading && (
                <div className="no-data">
                    <p>No hay datos de presupuesto disponibles para {year}.</p>
                    <p>Añade datos usando la API o importa desde fuentes gubernamentales.</p>
                </div>
            )}
        </div>
    );
};

export default BudgetOverview;

