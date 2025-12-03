document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customForm");
  const output = document.getElementById("formOutput");
  if (!form || !output) return;

  const showToast = (msg) => {
    let t = document.getElementById("submitToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "submitToast";
      document.body.appendChild(t);

      t.addEventListener("transitionend", () => {
        if (t.classList.contains("hide")) t.classList.remove("show", "hide");
      });
    }

    t.textContent = msg;

    clearTimeout(t._hideTimer);

    t.classList.remove("hide");
    void t.offsetWidth;         // restart animation
    t.classList.add("show");

    t._hideTimer = setTimeout(() => {
      t.classList.add("hide");
    }, 2000); // how long it stays visible
  };



  const randomCode = (len = 5) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // ✅ Only successful when valid
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);

    const formData = {
      name: (fd.get("name") || "").trim(),
      surname: (fd.get("surname") || "").trim(),
      email: (fd.get("email") || "").trim(),
      phone: (fd.get("phone") || "").trim(),
      address: (fd.get("address") || "").trim(),
      rating1: Number(fd.get("rating1")),
      rating2: Number(fd.get("rating2")),
      rating3: Number(fd.get("rating3")),
      helperTag: `FE24-JS-CF-${randomCode(5)}`
    };

    console.log(formData);

    const avg = (formData.rating1 + formData.rating2 + formData.rating3) / 3;
    const avgClass = avg <= 4 ? "avg-red" : avg <= 7 ? "avg-orange" : "avg-green"; // (keep your color logic if you already did)

    output.innerHTML = `
      <div class="p-3 border rounded-3">
        <div>Name: ${esc(formData.name)}</div>
        <div>Surname: ${esc(formData.surname)}</div>
        <div>Email: ${esc(formData.email)}</div>
        <div>Phone number: ${esc(formData.phone)}</div>
        <div>Address: ${esc(formData.address)}</div>
        <div>Rating 1: ${esc(formData.rating1)}</div>
        <div>Rating 2: ${esc(formData.rating2)}</div>
        <div>Rating 3: ${esc(formData.rating3)}</div>
        <div>Helper tag: ${esc(formData.helperTag)}</div>
        <hr class="my-2">
        <div><strong>${esc(formData.name)} ${esc(formData.surname)}:
          <span class="${avgClass}">${avg.toFixed(1)}</span>
        </strong></div>
      </div>
    `;

    // ✅ Show success popup ONLY after successful submission
    showToast("Form submitted successfully!");
  });
});
