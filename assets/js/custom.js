/* assets/js/custom.js
   Contact form: realtime validation + phone masking (+370 6xx xxxxx)
   + disable Submit until valid + output + helper tag + average color + success popup
*/

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customForm");
  const output = document.getElementById("formOutput");
  if (!form || !output) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  // -------------------- Inject minimal CSS (so you don't need extra files) --------------------
  const style = document.createElement("style");
  style.textContent = `
    .field-error{ color:#dc3545; font-size:.875rem; margin-top:.25rem; }
    .field-valid{ border-color:#198754 !important; }
    .field-invalid{ border-color:#dc3545 !important; }

    /* top-middle toast (slides down then up) */
    #submitToast{
      position:fixed; top:16px; left:50%;
      transform:translate(-50%,-28px);
      opacity:0; z-index:99999;
      padding:12px 16px; border-radius:14px;
      background:#198754; color:#fff; font-weight:700;
      box-shadow:0 18px 50px rgba(0,0,0,.25);
      transition:opacity .28s ease, transform .28s ease;
      pointer-events:none;
    }
    #submitToast.show{ transform:translate(-50%,0); opacity:1; }
    #submitToast.hide{ transform:translate(-50%,-28px); opacity:0; }

    @media (prefers-reduced-motion: reduce){
      #submitToast{ transition:none; }
    }
  `;
  document.head.appendChild(style);

  // -------------------- Helpers --------------------
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Helper tag required earlier: FE24-JS-CF- + 5 chars (A-Z, 0-9)
  const randomHelperTag = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `FE24-JS-CF-${code}`;
  };

  // Toast popup (only show on successful submit)
  const showToast = (msg) => {
    let t = document.getElementById("submitToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "submitToast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);

      t.addEventListener("transitionend", () => {
        if (t.classList.contains("hide")) t.classList.remove("show", "hide");
      });
    }

    t.textContent = msg;
    clearTimeout(t._timer);

    t.classList.remove("hide");
    void t.offsetWidth; // restart animation
    t.classList.add("show");

    t._timer = setTimeout(() => t.classList.add("hide"), 2000);
  };

  // Create / get error element under an input
  const getErrorEl = (input) => {
    let el = input.parentElement.querySelector(".field-error");
    if (!el) {
      el = document.createElement("div");
      el.className = "field-error";
      input.parentElement.appendChild(el);
    }
    return el;
  };

  // Set field UI states
  const setInvalid = (input, msg) => {
    input.classList.remove("field-valid");
    input.classList.add("field-invalid");
    getErrorEl(input).textContent = msg;
  };

  const setValid = (input) => {
    input.classList.remove("field-invalid");
    input.classList.add("field-valid");
    getErrorEl(input).textContent = "";
  };

  // -------------------- Field references --------------------
  const f = {
    name: form.querySelector('[name="name"]'),
    surname: form.querySelector('[name="surname"]'),
    email: form.querySelector('[name="email"]'),
    phone: form.querySelector('[name="phone"]'),
    address: form.querySelector('[name="address"]'),
    rating1: form.querySelector('[name="rating1"]'),
    rating2: form.querySelector('[name="rating2"]'),
    rating3: form.querySelector('[name="rating3"]'),
  };

  // -------------------- Validators (return {ok, msg}) --------------------
  const nameRe = /^\p{L}+$/u; // letters only (supports non-ASCII letters)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const vRequired = (val) => (val.trim() ? { ok: true } : { ok: false, msg: "This field is required." });

  const vName = (val) => {
    const r = vRequired(val);
    if (!r.ok) return r;
    return nameRe.test(val.trim())
      ? { ok: true }
      : { ok: false, msg: "Only letters are allowed." };
  };

  const vEmail = (val) => {
    const r = vRequired(val);
    if (!r.ok) return r;
    return emailRe.test(val.trim())
      ? { ok: true }
      : { ok: false, msg: "Enter a valid email address." };
  };

  const vAddress = (val) => {
    const r = vRequired(val);
    if (!r.ok) return r;

    const t = val.trim();
    const hasLetter = /\p{L}/u.test(t);
    // "meaningful text string": length + contains at least one letter
    return t.length >= 5 && hasLetter
      ? { ok: true }
      : { ok: false, msg: "Enter a meaningful address (min 5 chars, include letters)." };
  };

  const vRating = (val) => {
    const r = vRequired(val);
    if (!r.ok) return r;
    const n = Number(val);
    return Number.isFinite(n) && n >= 1 && n <= 10
      ? { ok: true }
      : { ok: false, msg: "Rating must be between 1 and 10." };
  };

  // -------------------- Phone mask / validation (Lithuania) --------------------
  // Accept digits only; normalize:
  // - if user types 370xxxx... => remove 370
  // - if user types 86xxxx...  => remove leading 8
  // - else treat as national (should be 6xxxxxxx, 8 digits)
  const phoneDigitsNational = (raw) => {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.startsWith("370")) d = d.slice(3);
    else if (d.startsWith("8")) d = d.slice(1);
    return d.slice(0, 8);
  };

  // Format as: +370 6xx xxxxx (progressive while typing)
  const formatLtPhone = (national8) => {
    const d = (national8 || "").slice(0, 8);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3);
    let out = "+370";
    if (p1) out += " " + p1;
    if (p2) out += " " + p2;
    return out;
  };

  const vPhone = (raw) => {
    const nat = phoneDigitsNational(raw);
    if (!nat) return { ok: false, msg: "Phone number is required." };
    if (!nat.startsWith("6")) return { ok: false, msg: "Lithuanian mobile must start with 6." };
    if (nat.length !== 8) return { ok: false, msg: "Phone must have 8 digits (6xx xxxxx)." };
    return { ok: true };
  };

  // Apply phone mask in real-time
  if (f.phone) {
    f.phone.addEventListener("input", () => {
      const nat = phoneDigitsNational(f.phone.value);
      f.phone.value = formatLtPhone(nat);

      // Validate phone (Task 2 rules)
      const res = vPhone(f.phone.value);
      res.ok ? setValid(f.phone) : setInvalid(f.phone, res.msg);

      updateSubmitState();
    });

    // Also validate on blur (if user leaves it)
    f.phone.addEventListener("blur", () => {
      const res = vPhone(f.phone.value);
      res.ok ? setValid(f.phone) : setInvalid(f.phone, res.msg);
      updateSubmitState();
    });
  }

  // -------------------- Real-time validation (all except phone uses rules above) --------------------
  const validateAndPaint = (input, validator) => {
    if (!input) return false;
    const res = validator(input.value);
    res.ok ? setValid(input) : setInvalid(input, res.msg);
    return res.ok;
  };

  // Real-time events
  if (f.name) {
    f.name.addEventListener("input", () => { validateAndPaint(f.name, vName); updateSubmitState(); });
    f.name.addEventListener("blur", () => { validateAndPaint(f.name, vName); updateSubmitState(); });
  }
  if (f.surname) {
    f.surname.addEventListener("input", () => { validateAndPaint(f.surname, vName); updateSubmitState(); });
    f.surname.addEventListener("blur", () => { validateAndPaint(f.surname, vName); updateSubmitState(); });
  }
  if (f.email) {
    f.email.addEventListener("input", () => { validateAndPaint(f.email, vEmail); updateSubmitState(); });
    f.email.addEventListener("blur", () => { validateAndPaint(f.email, vEmail); updateSubmitState(); });
  }
  if (f.address) {
    f.address.addEventListener("input", () => { validateAndPaint(f.address, vAddress); updateSubmitState(); });
    f.address.addEventListener("blur", () => { validateAndPaint(f.address, vAddress); updateSubmitState(); });
  }
  ["rating1", "rating2", "rating3"].forEach((k) => {
    if (!f[k]) return;
    f[k].addEventListener("input", () => { validateAndPaint(f[k], vRating); updateSubmitState(); });
    f[k].addEventListener("blur", () => { validateAndPaint(f[k], vRating); updateSubmitState(); });
  });

  // -------------------- Disable submit until whole form is valid --------------------
  function isFormValidSilent() {
    const okName = f.name ? vName(f.name.value).ok : false;
    const okSurname = f.surname ? vName(f.surname.value).ok : false;
    const okEmail = f.email ? vEmail(f.email.value).ok : false;
    const okAddress = f.address ? vAddress(f.address.value).ok : false;
    const okR1 = f.rating1 ? vRating(f.rating1.value).ok : false;
    const okR2 = f.rating2 ? vRating(f.rating2.value).ok : false;
    const okR3 = f.rating3 ? vRating(f.rating3.value).ok : false;
    const okPhone = f.phone ? vPhone(f.phone.value).ok : false;

    return okName && okSurname && okEmail && okPhone && okAddress && okR1 && okR2 && okR3;
  }

  function updateSubmitState() {
    if (!submitBtn) return;
    submitBtn.disabled = !isFormValidSilent();
  }

  // Initial state
  updateSubmitState();

  // -------------------- Submit: print object + show output + average color + popup --------------------
  form.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();

      // Paint all errors (so user sees what is wrong)
      validateAndPaint(f.name, vName);
      validateAndPaint(f.surname, vName);
      validateAndPaint(f.email, vEmail);
      validateAndPaint(f.address, vAddress);
      validateAndPaint(f.rating1, vRating);
      validateAndPaint(f.rating2, vRating);
      validateAndPaint(f.rating3, vRating);
      // phone (masked + validated)
      if (f.phone) {
        const res = vPhone(f.phone.value);
        res.ok ? setValid(f.phone) : setInvalid(f.phone, res.msg);
      }

      updateSubmitState();
      if (!isFormValidSilent()) return; // popup must appear only when successful

      const helperTag = randomHelperTag();

      const formData = {
        name: (f.name.value || "").trim(),
        surname: (f.surname.value || "").trim(),
        email: (f.email.value || "").trim(),
        phone: (f.phone.value || "").trim(),
        address: (f.address.value || "").trim(),
        rating1: Number(f.rating1.value),
        rating2: Number(f.rating2.value),
        rating3: Number(f.rating3.value),
        helperTag: `Helper tag: ${helperTag}`,
      };

      // Print object in console
      console.log(formData);

      // Average + color (0–4 red, 4–7 orange, 7–10 green)
      const avg = (formData.rating1 + formData.rating2 + formData.rating3) / 3;
      const avgColor = avg <= 4 ? "#dc3545" : avg <= 7 ? "#fd7e14" : "#198754";

      // Display each item per line
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
          <div>${esc(formData.helperTag)}</div>

          <hr class="my-2">

          <div>
            <strong>
              ${esc(formData.name)} ${esc(formData.surname)}:
              <span style="color:${avgColor}">${avg.toFixed(1)}</span>
            </strong>
          </div>
        </div>
      `;

      // Success popup (only on valid submit)
      showToast("Form submitted successfully!");
    },
    true // capture: helps ensure preventDefault runs even if other scripts exist
  );
});




/* =========================
   Memory Game (Flip Cards)
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const difficultyEl = document.getElementById("mgDifficulty");
  const boardEl = document.getElementById("mgBoard");
  const movesEl = document.getElementById("mgMoves");
  const matchesEl = document.getElementById("mgMatches");
  const timeEl = document.getElementById("mgTime");
  const bestEl = document.getElementById("mgBest");
  const winEl = document.getElementById("mgWin");
  const startBtn = document.getElementById("mgStartBtn");
  const restartBtn = document.getElementById("mgRestartBtn");

  // If section not present, do nothing
  if (!difficultyEl || !boardEl || !movesEl || !matchesEl || !timeEl || !bestEl || !winEl || !startBtn || !restartBtn) return;

  // Dataset: at least 6 unique items (we provide 12 for hard mode)
  const ITEMS = [
    { key: "alarm", icon: "bi-alarm" },
    { key: "award", icon: "bi-award" },
    { key: "bell", icon: "bi-bell" },
    { key: "bookmark", icon: "bi-bookmark-star" },
    { key: "camera", icon: "bi-camera" },
    { key: "cloud", icon: "bi-cloud" },
    { key: "cpu", icon: "bi-cpu" },
    { key: "gear", icon: "bi-gear" },
    { key: "heart", icon: "bi-heart" },
    { key: "light", icon: "bi-lightning-charge" },
    { key: "shield", icon: "bi-shield-lock" },
    { key: "wifi", icon: "bi-wifi" },
  ];

  const DIFF = {
    easy: { cols: 4, rows: 3 }, // 12 cards = 6 pairs
    hard: { cols: 6, rows: 4 }, // 24 cards = 12 pairs
  };

  // ----- State -----
  let difficulty = difficultyEl.value || "easy";
  let started = false;
  let lock = false;
  let firstCard = null;
  let secondCard = null;
  let moves = 0;
  let matches = 0;
  let totalPairs = 0;

  // Timer
  let timerId = null;
  let startMs = 0;

  // Best results stored in localStorage (fewest moves)
  const bestKey = (diff) => `mg_best_moves_${diff}`;

  const readBest = (diff) => {
    try {
      const v = localStorage.getItem(bestKey(diff));
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  };

  const writeBest = (diff, value) => {
    try {
      localStorage.setItem(bestKey(diff), String(value));
    } catch {
      // ignore
    }
  };

  const updateBestUI = () => {
    const bEasy = readBest("easy");
    const bHard = readBest("hard");
    bestEl.textContent = `Best Easy: ${bEasy ?? "—"} | Best Hard: ${bHard ?? "—"}`;
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const formatTime = (sec) => `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;

  const startTimer = () => {
    stopTimer();
    startMs = Date.now();
    timeEl.textContent = "00:00";
    timerId = setInterval(() => {
      const sec = Math.floor((Date.now() - startMs) / 1000);
      timeEl.textContent = formatTime(sec);
    }, 250);
  };

  const stopTimer = () => {
    if (timerId) clearInterval(timerId);
    timerId = null;
  };

  const resetTimer = () => {
    stopTimer();
    timeEl.textContent = "00:00";
  };

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const setStats = () => {
    movesEl.textContent = String(moves);
    matchesEl.textContent = `${matches}/${totalPairs}`;
  };

  const setWin = (show) => {
    winEl.classList.toggle("show", !!show);
  };

  const setBoardEnabled = (on) => {
    boardEl.classList.toggle("is-disabled", !on);
  };

  // Create deck based on difficulty (pairs needed)
  const buildDeck = (pairCount) => {
    const base = ITEMS.slice(0, pairCount);
    const deck = [];
    base.forEach((it) => {
      deck.push({ key: it.key, icon: it.icon });
      deck.push({ key: it.key, icon: it.icon });
    });
    return shuffle(deck);
  };

  // Build HTML board dynamically
  const renderBoard = () => {
    const { cols, rows } = DIFF[difficulty];
    const cardsCount = cols * rows;
    totalPairs = cardsCount / 2;

    const deck = buildDeck(totalPairs);

    boardEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    boardEl.innerHTML = "";

    deck.forEach((card) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-card";
      btn.setAttribute("data-key", card.key);
      btn.setAttribute("aria-label", "Memory card");

      btn.innerHTML = `
        <div class="mg-inner">
          <div class="mg-face mg-front"></div>
          <div class="mg-face mg-back"><i class="bi ${card.icon}"></i></div>
        </div>
      `;

      btn.addEventListener("click", () => onCardClick(btn));
      boardEl.appendChild(btn);
    });
  };

  const resetState = () => {
    started = false;
    lock = false;
    firstCard = null;
    secondCard = null;
    moves = 0;
    matches = 0;
    setStats();
    setWin(false);
    resetTimer();
    setBoardEnabled(false);
  };

  const initGame = () => {
    resetState();
    renderBoard();
    updateBestUI();
  };

  const startGame = () => {
    if (started) return;
    started = true;
    setWin(false);
    setBoardEnabled(true);
    startTimer();
  };

  const restartGame = () => {
    // Reset stats + reshuffle + hide cards + start immediately
    resetState();
    renderBoard();
    started = true;
    setBoardEnabled(true);
    startTimer();
  };

  const flip = (btn, on) => {
    btn.classList.toggle("is-flipped", !!on);
  };

  const markMatched = (btn) => {
    btn.classList.add("matched");
    btn.disabled = true; // inactive
  };

  const onCardClick = (btn) => {
    if (!started) return;
    if (lock) return;
    if (btn.disabled) return;
    if (btn === firstCard) return;
    if (btn.classList.contains("is-flipped")) return;

    flip(btn, true);

    if (!firstCard) {
      firstCard = btn;
      return;
    }

    // Second card flipped
    secondCard = btn;
    lock = true;
    moves += 1;
    setStats();

    const a = firstCard.getAttribute("data-key");
    const b = secondCard.getAttribute("data-key");

    if (a === b) {
      // Match
      markMatched(firstCard);
      markMatched(secondCard);
      matches += 1;
      setStats();

      firstCard = null;
      secondCard = null;
      lock = false;

      // Win condition
      if (matches === totalPairs) {
        stopTimer();
        setWin(true);
        setBoardEnabled(false);

        // Best moves per difficulty
        const prevBest = readBest(difficulty);
        if (prevBest === null || moves < prevBest) {
          writeBest(difficulty, moves);
          updateBestUI();
        }
      }
      return;
    }

    // Not match: flip back after delay
    setTimeout(() => {
      flip(firstCard, false);
      flip(secondCard, false);
      firstCard = null;
      secondCard = null;
      lock = false;
    }, 1000);
  };

  // Difficulty change: reinitialize (reshuffle + reset stats)
  difficultyEl.addEventListener("change", () => {
    difficulty = difficultyEl.value;
    initGame();
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", restartGame);

  // Init on load
  initGame();
});
