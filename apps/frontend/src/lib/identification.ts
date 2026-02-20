export const parseIdentification = (value: string, fallbackType: string) => {
  const raw = (value || '').trim();
  if (!raw) {
    return { type: fallbackType, number: '' };
  }

  const compact = raw.replace(/\s+/g, '');

  const dashIndex = compact.indexOf('-');
  if (dashIndex > 0) {
    const type = compact.slice(0, dashIndex);
    const number = compact.slice(dashIndex + 1);
    return { type, number };
  }

  const letterMatch = compact.match(/^([A-Za-z])(\d.+)$/);
  if (letterMatch) {
    return { type: letterMatch[1], number: letterMatch[2] };
  }

  return { type: fallbackType, number: compact };
};

export const composeIdentification = (type: string, number: string) => {
  const cleanType = (type || '').trim();
  const cleanNumber = (number || '').trim();
  if (!cleanType || !cleanNumber) {
    return undefined;
  }
  return `${cleanType}-${cleanNumber}`;
};

