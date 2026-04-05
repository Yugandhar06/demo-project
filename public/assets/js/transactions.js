let currentUser;
let currentRecords = [];

function renderRecords() {
  const table = document.getElementById("records-table");
  const canManage = currentUser.role === "admin";

  table.innerHTML = currentRecords
    .map(
      (record) => `
        <tr>
          <td>${window.financePro.formatDate(record.recordDate)}</td>
          <td>${record.category}</td>
          <td><span class="badge ${record.type}">${record.type}</span></td>
          <td>${window.financePro.formatCurrency(record.amount)}</td>
          <td>${record.notes || "-"}</td>
          <td ${canManage ? "" : 'style="display:none"'}>${
            canManage
              ? `<button class="btn secondary" data-edit="${record.id}">Edit</button>
                 <button class="btn secondary" data-delete="${record.id}">Delete</button>`
              : ""
          }</td>
        </tr>
      `
    )
    .join("");
}

async function loadRecords() {
  const category = document.getElementById("filter-category").value.trim();
  const type = document.getElementById("filter-type").value;
  const month = document.getElementById("filter-date").value;
  const params = new URLSearchParams();

  if (category) params.set("category", category);
  if (type) params.set("type", type);
  if (month) {
    params.set("startDate", `${month}-01`);
    params.set("endDate", `${month}-31`);
  }

  const url = `/api/records${params.toString() ? `?${params}` : ""}`;
  const payload = await window.financePro.apiFetch(url);
  currentRecords = payload.data.records;
  renderRecords();
}

(async () => {
  currentUser = await window.financePro.bootstrapProtectedPage("viewer");
  if (!currentUser) {
    return;
  }

  const form = document.getElementById("record-form");
  const message = document.getElementById("records-message");

  if (currentUser.role !== "admin") {
    form.style.display = "none";
  }

  await loadRecords();

  document.getElementById("filter-button").addEventListener("click", loadRecords);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    window.financePro.clearMessage(message);

    const recordId = form.recordId.value;
    const payload = {
      amount: Number(form.amount.value),
      type: form.type.value,
      category: form.category.value,
      recordDate: form.recordDate.value,
      notes: form.notes.value,
    };

    try {
      await window.financePro.apiFetch(recordId ? `/api/records/${recordId}` : "/api/records", {
        method: recordId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      form.recordId.value = "";
      window.financePro.showMessage(message, recordId ? "Record updated." : "Record created.");
      await loadRecords();
    } catch (error) {
      window.financePro.showMessage(message, error.message, "error");
    }
  });

  document.getElementById("records-table").addEventListener("click", async (event) => {
    const editId = event.target.getAttribute("data-edit");
    const deleteId = event.target.getAttribute("data-delete");

    if (editId) {
      const record = currentRecords.find((entry) => entry.id === editId);
      form.recordId.value = record.id;
      form.amount.value = record.amount;
      form.type.value = record.type;
      form.category.value = record.category;
      form.recordDate.value = record.recordDate;
      form.notes.value = record.notes || "";
    }

    if (deleteId) {
      try {
        await window.financePro.apiFetch(`/api/records/${deleteId}`, { method: "DELETE" });
        window.financePro.showMessage(message, "Record deleted.");
        await loadRecords();
      } catch (error) {
        window.financePro.showMessage(message, error.message, "error");
      }
    }
  });
})();
