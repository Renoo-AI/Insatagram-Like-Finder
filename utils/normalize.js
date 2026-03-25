function normalizeLikes(text) {
  if (!text) return null;

  // Convert to upper case for easier matching of K/M
  text = text.toUpperCase();

  // Extract the numeric part and potential suffix (K/M)
  // Matches "1.2K", "1,234", "2M", etc.
  const match = text.match(/([\d,\.]+)\s*([KM]?)/);
  if (!match) return null;

  let numberStr = match[1].replace(/,/g, ''); // Remove commas
  const suffix = match[2];

  let number = parseFloat(numberStr);

  if (isNaN(number)) return null;

  if (suffix === 'K') {
    number *= 1000;
  } else if (suffix === 'M') {
    number *= 1000000;
  }

  return Math.floor(number); // Return integer
}

module.exports = { normalizeLikes };
