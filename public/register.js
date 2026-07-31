// Terminal ambiente (mesmo estilo da tela de login)
const terminalBody = document.getElementById('terminalBody');
const logLines = [
  { html: '<span class="muted">$</span> <span class="cmd">devflow init</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">repositório criado</span>' },
  { html: '<span class="muted">$</span> <span class="cmd">git checkout -b conta/nova</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">branch criado</span>' },
  { html: '<span class="muted">$</span> <span class="cmd">devflow config user.email</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">configuração salva</span>' },
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
renderNextLine();
setInterval(renderNextLine, 1400);

// Mostrar/ocultar senha
const passwordInput = document.getElementById('password');
document.getElementById('toggleVisibility').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
});

// Validação + envio ao backend
const form = document.getElementById('registerForm');
const emailInput = document.getElementById('email');
const confirmInput = document.getElementById('confirmPassword');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmError = document.getElementById('confirmError');
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value;
  const confirmValue = confirmInput.value;

  let hasError = false;

  if (!emailValue || !isValidEmail(emailValue)) {
    setFieldError(emailInput, emailError, 'informe um e-mail válido');
    hasError = true;
  } else {
    setFieldError(emailInput, emailError, '');
  }

  if (!passwordValue || passwordValue.length < 6) {
    setFieldError(passwordInput, passwordError, 'mínimo de 6 caracteres');
    hasError = true;
  } else {
    setFieldError(passwordInput, passwordError, '');
  }

  if (confirmValue !== passwordValue) {
    setFieldError(confirmInput, confirmError, 'as senhas não coincidem');
    hasError = true;
  } else {
    setFieldError(confirmInput, confirmError, '');
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.classList.add('running');
  submitLog.textContent = 'criando conta…';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    });
    const data = await response.json();

    if (!response.ok) {
      submitBtn.classList.remove('running');
      submitBtn.disabled = false;
      setFieldError(emailInput, emailError, data.message || 'erro ao criar conta');
      return;
    }

    submitLog.textContent = 'conta criada ✓';
    submitBtn.classList.add('success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
  } catch (err) {
    submitBtn.classList.remove('running');
    submitBtn.disabled = false;
    setFieldError(emailInput, emailError, 'erro de conexão com o servidor');
  }
});
