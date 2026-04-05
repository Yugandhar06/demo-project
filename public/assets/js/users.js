let users = [];

function renderUsers() {
  const table = document.getElementById("users-table");
  table.innerHTML = users
    .map(
      (user) => `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td><span class="badge ${user.role}">${user.role}</span></td>
          <td><span class="badge ${user.status}">${user.status}</span></td>
          <td>
            <button class="btn secondary" data-edit="${user.id}">Edit</button>
            <button class="btn secondary" data-status="${user.id}">
              ${user.status === "active" ? "Deactivate" : "Activate"}
            </button>
            <button class="btn secondary" data-delete="${user.id}">Delete</button>
          </td>
        </tr>
      `
    )
    .join("");
}

async function loadUsers() {
  const payload = await window.financePro.apiFetch("/api/users");
  users = payload.data.users;
  renderUsers();
}

(async () => {
  const user = await window.financePro.bootstrapProtectedPage("admin");
  if (!user) {
    return;
  }

  const form = document.getElementById("user-form");
  const message = document.getElementById("users-message");
  await loadUsers();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    window.financePro.clearMessage(message);

    const userId = form.userId.value;
    const payload = {
      name: form.name.value,
      email: form.email.value,
      role: form.role.value,
    };

    if (form.password.value) {
      payload.password = form.password.value;
    }

    try {
      await window.financePro.apiFetch(userId ? `/api/users/${userId}` : "/api/users", {
        method: userId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      form.userId.value = "";
      window.financePro.showMessage(message, userId ? "User updated." : "User created.");
      await loadUsers();
    } catch (error) {
      window.financePro.showMessage(message, error.message, "error");
    }
  });

  document.getElementById("users-table").addEventListener("click", async (event) => {
    const editId = event.target.getAttribute("data-edit");
    const statusId = event.target.getAttribute("data-status");
    const deleteId = event.target.getAttribute("data-delete");

    if (editId) {
      const selected = users.find((entry) => entry.id === editId);
      form.userId.value = selected.id;
      form.name.value = selected.name;
      form.email.value = selected.email;
      form.role.value = selected.role;
      form.password.value = "";
    }

    if (statusId) {
      const selected = users.find((entry) => entry.id === statusId);
      const nextStatus = selected.status === "active" ? "inactive" : "active";
      try {
        await window.financePro.apiFetch(`/api/users/${statusId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        window.financePro.showMessage(message, `User ${nextStatus}.`);
        await loadUsers();
      } catch (error) {
        window.financePro.showMessage(message, error.message, "error");
      }
    }

    if (deleteId) {
      try {
        await window.financePro.apiFetch(`/api/users/${deleteId}`, { method: "DELETE" });
        window.financePro.showMessage(message, "User deleted.");
        await loadUsers();
      } catch (error) {
        window.financePro.showMessage(message, error.message, "error");
      }
    }
  });
})();
