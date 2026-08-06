// ============================================================
// Terminal ambiente (mesmo estilo do login)
// ============================================================
const terminalBody = document.getElementById('terminalBody');
const logLines = [
  { html: '<span class="cmd">Abrindo formulário de pedido…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">ficha em branco pronta</span>' },
  { html: '<span class="cmd">Conferindo CPF/CNPJ…</span>' },
  { html: '<span class="ok">✓</span> <span class="muted">aguardando seu pedido</span>' },
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
setInterval(renderNextLine, 1600);

// ============================================================
// Validação de CPF/CNPJ + máscaras (mesma lógica do painel)
// ============================================================
function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10 || d1 === 11) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10 || d2 === 11) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calcDigit = (base) => {
    let pos = base.length - 7;
    let sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base[base.length - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };
  const base = cnpj.substring(0, 12);
  const d1 = calcDigit(base);
  const d2 = calcDigit(base + d1);
  return cnpj === base + String(d1) + String(d2);
}

function formatDocument(value, type) {
  const digits = onlyDigits(value).slice(0, type === 'cnpj' ? 14 : 11);
  if (type === 'cnpj') {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

const documentTypeSelect = document.getElementById('reqDocumentType');
const documentInput = document.getElementById('reqDocument');
const phoneInput = document.getElementById('reqPhone');

function updatePlaceholder() {
  documentInput.placeholder = documentTypeSelect.value === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00';
}
documentTypeSelect.addEventListener('change', updatePlaceholder);
updatePlaceholder();

documentInput.addEventListener('input', () => {
  documentInput.value = formatDocument(documentInput.value, documentTypeSelect.value);
});
phoneInput.addEventListener('input', () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

// ============================================================
// Envio do formulário
// ============================================================
const form = document.getElementById('requestForm');
const submitBtn = document.getElementById('submitBtn');
const submitLog = document.getElementById('submitLog');
const formWrap = document.getElementById('requestFormWrap');
const successWrap = document.getElementById('requestSuccess');

function setError(id, message) {
  document.getElementById(id).textContent = message || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('reqName').value.trim();
  const description = document.getElementById('reqDescription').value.trim();
  const documentValue = documentInput.value.trim();

  setError('reqNameError', '');
  setError('reqDocumentError', '');
  setError('reqDescriptionError', '');
  documentInput.classList.remove('invalid');

  let hasError = false;

  if (!name) {
    setError('reqNameError', 'informe seu nome');
    hasError = true;
  }
  if (!description) {
    setError('reqDescriptionError', 'descreva o sistema que você precisa');
    hasError = true;
  }
  if (documentValue) {
    const valid =
      documentTypeSelect.value === 'cnpj' ? isValidCNPJ(documentValue) : isValidCPF(documentValue);
    if (!valid) {
      documentInput.classList.add('invalid');
      setError('reqDocumentError', `${documentTypeSelect.value.toUpperCase()} inválido — confira os números`);
      hasError = true;
    }
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.classList.add('running');
  submitLog.textContent = 'enviando pedido…';

  try {
    const res = await fetch('/api/public/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        documentType: documentTypeSelect.value,
        document: documentValue,
        phone: phoneInput.value.trim(),
        email: document.getElementById('reqEmail').value.trim(),
        description,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      submitBtn.classList.remove('running');
      submitBtn.disabled = false;
      if (data.field === 'document') {
        documentInput.classList.add('invalid');
        setError('reqDocumentError', data.message);
      } else if (data.field === 'name') {
        setError('reqNameError', data.message);
      } else if (data.field === 'description') {
        setError('reqDescriptionError', data.message);
      } else {
        setError('reqDescriptionError', data.message || 'não foi possível enviar o pedido');
      }
      return;
    }

    submitBtn.classList.add('success');
    formWrap.hidden = true;
    successWrap.hidden = false;
  } catch (err) {
    submitBtn.classList.remove('running');
    submitBtn.disabled = false;
    setError('reqDescriptionError', 'erro de conexão com o servidor');
  }
});

document.getElementById('newRequestBtn').addEventListener('click', () => {
  form.reset();
  updatePlaceholder();
  submitBtn.classList.remove('running', 'success');
  submitBtn.disabled = false;
  formWrap.hidden = false;
  successWrap.hidden = true;
});
