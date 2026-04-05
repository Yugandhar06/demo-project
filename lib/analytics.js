function getActiveRecords(store) {
  return store.records.filter((record) => !record.deletedAt);
}

function getDashboardSummary(store) {
  const activeRecords = getActiveRecords(store);
  const totalIncome = activeRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + Number(record.amount), 0);
  const totalExpenses = activeRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + Number(record.amount), 0);
  const recentActivity = [...activeRecords]
    .sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate))
    .slice(0, 5);

  const categoryTotalsMap = new Map();
  for (const record of activeRecords) {
    const previous = categoryTotalsMap.get(record.category) || 0;
    categoryTotalsMap.set(record.category, previous + Number(record.amount));
  }

  const categoryTotals = [...categoryTotalsMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryTotals,
    recentActivity,
  };
}

function getInsights(store) {
  const activeRecords = getActiveRecords(store);
  const expenseRecords = activeRecords.filter((record) => record.type === "expense");
  const monthlyMap = new Map();

  for (const record of activeRecords) {
    const month = record.recordDate.slice(0, 7);
    const previous = monthlyMap.get(month) || { month, income: 0, expense: 0 };
    previous[record.type] += Number(record.amount);
    monthlyMap.set(month, previous);
  }

  const monthlyTotals = [...monthlyMap.values()].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const categoryExpenseMap = new Map();
  for (const record of expenseRecords) {
    const previous = categoryExpenseMap.get(record.category) || 0;
    categoryExpenseMap.set(record.category, previous + Number(record.amount));
  }

  const categoryBreakdown = [...categoryExpenseMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7);
  const currentMonthSpend = expenseRecords
    .filter((record) => record.recordDate.startsWith(currentMonth))
    .reduce((sum, record) => sum + Number(record.amount), 0);
  const lastMonthSpend = expenseRecords
    .filter((record) => record.recordDate.startsWith(lastMonth))
    .reduce((sum, record) => sum + Number(record.amount), 0);
  const trendPercent = lastMonthSpend
    ? Number((((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100).toFixed(1))
    : 0;
  const budgetLimit = 10000;

  return {
    monthlyTotals,
    currentMonthSpend,
    lastMonthSpend,
    trendPercent,
    predictedNextMonthSpend: Math.round(currentMonthSpend * 0.92),
    topCategory: categoryBreakdown[0] || null,
    categoryBreakdown,
    budgetLimit,
    budgetUsedPercent: budgetLimit
      ? Number(((currentMonthSpend / budgetLimit) * 100).toFixed(1))
      : 0,
  };
}

module.exports = {
  getActiveRecords,
  getDashboardSummary,
  getInsights,
};
