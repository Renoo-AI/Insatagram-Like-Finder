const cache = {};
const TTL_MS = 60 * 1000; // 60 seconds

function getCache(key) {
  const item = cache[key];
  if (!item) return null;

  if (Date.now() > item.expiry) {
    // Expired
    delete cache[key];
    return null;
  }

  return item.value;
}

function setCache(key, value) {
  cache[key] = {
    value,
    expiry: Date.now() + TTL_MS
  };
}

module.exports = {
  getCache,
  setCache
};
