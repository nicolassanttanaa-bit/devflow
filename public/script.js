// Se já existir uma sessão válida, pula direto para o painel.
fetch('/api/me').then((res) => {
  if (res.ok) window.location.href = 'dashboard.html';
});

// ============================================================
// Animação ambiente do terminal (painel esquerdo)
// ============================================================
const terminalBody = document.getElementById('terminalBody');

const logLines = [
  { html: '<span class="cmd">Abrindo ficha do cliente…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">ficha localizada</span>' },
  { html: '<span class="cmd">Anotando especificação do sistema…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">linguagens registradas</span>' },
  { html: '<span class="cmd">Conferindo prazo de entrega…</span>' },
  { html: '<span class="warn">⚠</span> <span class="muted">2 sistemas vencem esta semana</span>' },
  { html: '<span class="cmd">Carimbando status…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">EM DESENVOLVIMENTO</span>' },
  { html: '<span class="cmd">Arquivando na pasta do cliente…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">ficha em dia</span>' },
];

let lineIndex = 0;

function renderNextLine() {
  if (terminalBody.children.length > 7) {
    terminalBody.removeChild(terminalBody.firstElementChild);
  }
  const line = document.createElement('div');
  line.className = 'terminal-line';
  line.innerHTML = logLines[lineIndex].html;
  terminalBody.appendChild(line);
  lineIndex = (lineIndex + 1) % logLines.length;
}

function startTerminalLoop() {
  renderNextLine();
  setInterval(renderNextLine, 1400);
}

startTerminalLoop();

// ============================================================
// Mostrar / ocultar senha
// ============================================================
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('toggleVisibility');

toggleBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  toggleBtn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
});

// ============================================================
// Validação + chamada real ao backend (/api/login)
// ============================================================
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const submitBtn = document.getElementById('submitBtn');
const submitLog = document.getElementById('submitLog');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setFieldError(input, errorEl, message) {
  if (message) {
    input.classList.add('invalid');
    errorEl.textContent = message;
  } else {
    input.classList.remove('invalid');
    errorEl.textContent = '';
  }
}

function setSubmitState(text) {
  submitLog.textContent = text;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value;

  let hasError = false;

  if (!emailValue) {
    setFieldError(emailInput, emailError, 'informe seu e-mail');
    hasError = true;
  } else if (!isValidEmail(emailValue)) {
    setFieldError(emailInput, emailError, 'e-mail em formato inválido');
    hasError = true;
  } else {
    setFieldError(emailInput, emailError, '');
  }

  if (!passwordValue) {
    setFieldError(passwordInput, passwordError, 'informe sua senha');
    hasError = true;
  } else {
    setFieldError(passwordInput, passwordError, '');
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.classList.add('running');
  setSubmitState('verificando credenciais…');

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    });

    const data = await response.json();

    if (!response.ok) {
      setSubmitState('');
      submitBtn.classList.remove('running');
      submitBtn.disabled = false;
      setFieldError(passwordInput, passwordError, data.message || 'não foi possível entrar');
      return;
    }

    setSubmitState('acesso liberado ✓');
    submitBtn.classList.add('success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } catch (err) {
    setSubmitState('');
    submitBtn.classList.remove('running');
    submitBtn.disabled = false;
    setFieldError(passwordInput, passwordError, 'erro de conexão com o servidor');
  }
});
