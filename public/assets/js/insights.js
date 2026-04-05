(async () => {
  const user = await window.financePro.bootstrapProtectedPage("analyst");
  if (!user) {
    return;
  }

  const payload = await window.financePro.apiFetch("/api/insights/trends");
  const insights = payload.data;

  document.getElementById("current-month-spend").textContent = window.financePro.formatCurrency(insights.currentMonthSpend);
  document.getElementById("last-month-spend").textContent = window.financePro.formatCurrency(insights.lastMonthSpend);
  document.getElementById("trend-value").textContent = `${insights.trendPercent}%`;
  document.getElementById("predicted-spend").textContent = window.financePro.formatCurrency(insights.predictedNextMonthSpend);

  document.getElementById("monthly-totals").innerHTML = insights.monthlyTotals
    .map((month) => {
      const total = month.income + month.expense;
      const expenseWidth = total ? Math.round((month.expense / total) * 100) : 0;
      return `
        <div class="bar-row">
          <div><strong>${month.month}</strong> • Income ${window.financePro.formatCurrency(month.income)} • Expense ${window.financePro.formatCurrency(month.expense)}</div>
          <div class="bar"><span style="width:${expenseWidth}%"></span></div>
        </div>
      `;
    })
    .join("");

  document.getElementById("top-category").innerHTML = insights.topCategory
    ? `<div class="list-item"><div><strong>${insights.topCategory.category}</strong><div class="helper">Highest expense category</div></div><strong>${window.financePro.formatCurrency(insights.topCategory.total)}</strong></div>`
    : `<div class="list-item">No expense data yet.</div>`;

  document.getElementById("budget-status").innerHTML = `
    <div class="list-item">
      <div>
        <strong>${window.financePro.formatCurrency(insights.currentMonthSpend)} of ${window.financePro.formatCurrency(insights.budgetLimit)}</strong>
        <div class="helper">Budget used: ${insights.budgetUsedPercent}%</div>
      </div>
      <span class="badge ${insights.budgetUsedPercent > 100 ? "inactive" : "active"}">
        ${insights.budgetUsedPercent > 100 ? "Exceeded" : "On Track"}
      </span>
    </div>
  `;
})();
