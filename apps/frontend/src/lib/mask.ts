export const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const prefix = user.slice(0, 3) || user;
  const dots = user.length > 3 ? '***' : '';
  return `${prefix}${dots}@${domain}`;
};

export const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
};

export const maskId = (id: string) => {
  const match = id.match(/^([A-Za-z]-\d{2})\.(\d{3})\.(\d{3})$/);
  if (!match) return id;
  return `${match[1]}.***.${match[3]}`;
};

