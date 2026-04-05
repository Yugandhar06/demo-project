(async () => {
  const user = await window.financePro.bootstrapProtectedPage("viewer");
  if (!user) {
    return;
  }

  const payload = await window.financePro.apiFetch("/api/dashboard/summary");
  const summary = payload.data;

  document.getElementById("net-balance").textContent = window.financePro.formatCurrency(summary.netBalance);
  document.getElementById("total-income").textContent = window.financePro.formatCurrency(summary.totalIncome);
  document.getElementById("total-expenses").textContent = window.financePro.formatCurrency(summary.totalExpenses);

  document.getElementById("category-totals").innerHTML = summary.categoryTotals
    .map((item) => {
      const width = summary.categoryTotals[0]?.total
        ? Math.round((item.total / summary.categoryTotals[0].total) * 100)
        : 0;
      return `
        <div class="bar-row">
          <div>${item.category} <strong>${window.financePro.formatCurrency(item.total)}</strong></div>
          <div class="bar"><span style="width:${width}%"></span></div>
        </div>
      `;
    })
    .join("");

  document.getElementById("recent-activity").innerHTML = summary.recentActivity
    .map(
      (item) => `
        <div class="list-item">
          <div>
            <strong>${item.category}</strong>
            <div class="helper">${window.financePro.formatDate(item.recordDate)} • ${item.notes || "No notes"}</div>
          </div>
          <strong>${item.type === "expense" ? "-" : "+"}${window.financePro.formatCurrency(item.amount)}</strong>
        </div>
      `
    )
    .join("");
})();
