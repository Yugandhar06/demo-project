document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("login-message");
  window.financePro.clearMessage(message);

  try {
    await window.financePro.apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value,
      }),
    });
    window.location.href = "/dashboard";
  } catch (error) {
    window.financePro.showMessage(message, error.message, "error");
  }
});
