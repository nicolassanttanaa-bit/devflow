// validators.js
// Validação real de CPF e CNPJ (cálculo dos dígitos verificadores),
// não só formato. Usado no servidor antes de salvar um cliente.

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // ex: 111.111.111-11

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10 || digit1 === 11) digit1 = 0;
  if (digit1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10 || digit2 === 11) digit2 = 0;
  if (digit2 !== parseInt(cpf[10], 10)) return false;

  return true;
}

function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base) => {
    let length = base.length;
    let pos = length - 7;
    let sum = 0;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(base[length - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const base = cnpj.substring(0, 12);
  const digit1 = calcDigit(base);
  const digit2 = calcDigit(base + digit1);

  return cnpj === base + String(digit1) + String(digit2);
}

// Valida automaticamente como CPF (11 dígitos) ou CNPJ (14 dígitos).
function isValidDocument(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

module.exports = { onlyDigits, isValidCPF, isValidCNPJ, isValidDocument };
