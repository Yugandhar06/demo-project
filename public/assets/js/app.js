const roleRank = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}

async function getCurrentUser() {
  const payload = await apiFetch("/api/auth/me");
  return payload.data.user;
}

function showMessage(element, text, type = "success") {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `message show ${type}`;
}

function clearMessage(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.className = "message";
}

function bindLogout(button) {
  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  });
}

function setSidebarUser(user) {
  const nameNode = document.querySelector("[data-user-name]");
  const roleNode = document.querySelector("[data-user-role]");
  if (nameNode) {
    nameNode.textContent = user.name;
  }
  if (roleNode) {
    roleNode.textContent = user.role;
  }
}

function enforceRoleVisibility(user) {
  document.querySelectorAll("[data-min-role]").forEach((element) => {
    const required = element.getAttribute("data-min-role");
    const allowed = roleRank[user.role] >= roleRank[required];
    element.style.display = allowed ? "" : "none";
  });
}

async function bootstrapProtectedPage(minRole = "viewer") {
  try {
    const user = await getCurrentUser();
    if (roleRank[user.role] < roleRank[minRole]) {
      window.location.href = "/dashboard";
      return null;
    }

    setSidebarUser(user);
    enforceRoleVisibility(user);
    bindLogout(document.querySelector("[data-logout]"));
    return user;
  } catch {
    window.location.href = "/";
    return null;
  }
}

window.financePro = {
  apiFetch,
  bootstrapProtectedPage,
  clearMessage,
  formatCurrency,
  formatDate,
  showMessage,
};
