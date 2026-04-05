const test = require("node:test");
const assert = require("node:assert/strict");
const { getDashboardSummary, getInsights } = require("../lib/analytics");

test("dashboard summary computes totals", () => {
  const store = {
    records: [
      { amount: 100, type: "income", category: "A", recordDate: "2026-01-10" },
      { amount: 40, type: "expense", category: "B", recordDate: "2026-01-11" },
    ],
  };

  const summary = getDashboardSummary(store);
  assert.equal(summary.totalIncome, 100);
  assert.equal(summary.totalExpenses, 40);
  assert.equal(summary.netBalance, 60);
});

test("insights include category breakdown", () => {
  const store = {
    records: [
      { amount: 80, type: "expense", category: "Travel", recordDate: "2026-04-01" },
      { amount: 20, type: "expense", category: "Travel", recordDate: "2026-04-02" },
      { amount: 50, type: "income", category: "Sales", recordDate: "2026-04-03" },
    ],
  };

  const insights = getInsights(store);
  assert.equal(insights.topCategory.category, "Travel");
  assert.equal(insights.topCategory.total, 100);
});
