let currentPage = 1;
let totalPages = 1;

async function loadAuditLogs() {
  const payload = await window.financePro.apiFetch(`/api/audit-logs?page=${currentPage}`);
  const { logs, pagination } = payload.data;
  totalPages = pagination.totalPages;

  const container = document.getElementById("audit-list");
  container.insertAdjacentHTML(
    "beforeend",
    logs
      .map(
        (log) => `
          <div class="list-item">
            <div>
              <strong>${log.action} ${log.entityType}</strong>
              <div class="helper">${log.details}</div>
              <div class="helper">${log.actorEmail}</div>
            </div>
            <span>${window.financePro.formatDate(log.createdAt)}</span>
          </div>
        `
      )
      .join("")
  );

  document.getElementById("load-more-audit").style.display =
    currentPage >= totalPages ? "none" : "";
}

(async () => {
  const user = await window.financePro.bootstrapProtectedPage("admin");
  if (!user) {
    return;
  }

  await loadAuditLogs();

  document.getElementById("load-more-audit").addEventListener("click", async () => {
    if (currentPage >= totalPages) {
      return;
    }
    currentPage += 1;
    await loadAuditLogs();
  });
})();
