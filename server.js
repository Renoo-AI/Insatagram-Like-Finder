const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { scrapeEmbed } = require('./scraper/embed');
const { scrapePlaywright, closeBrowser } = require('./scraper/playwright');
const { getCache, setCache } = require('./utils/cache');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', limiter);

app.post('/api/get-likes', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('https://www.instagram.com/')) {
      return res.status(400).json({ success: false, error: 'Valid Instagram URL is required.' });
    }

    console.log(`\n--- Request received for URL: ${url} ---`);

    // 1. Check Cache
    const cachedResult = getCache(url);
    if (cachedResult !== null) {
      console.log(`[CACHE] Hit! Returning cached value: ${cachedResult}`);
      return res.json({ success: true, likes: cachedResult });
    }

    // 2. Layer 1: Embed Scraper (Fast)
    console.log('[PIPELINE] Starting Layer 1 (Embed Scraper)...');
    const embedResult = await scrapeEmbed(url);

    if (embedResult.success) {
      setCache(url, embedResult.likes);
      return res.json(embedResult);
    }

    // 3. Layer 2: Playwright Scraper (Fallback)
    console.log('[PIPELINE] Layer 1 failed. Falling back to Layer 2 (Playwright Scraper)...');
    const playwrightResult = await scrapePlaywright(url);

    if (playwrightResult.success) {
      setCache(url, playwrightResult.likes);
      return res.json(playwrightResult);
    } else {
      console.log('[PIPELINE] Layer 2 failed.');
      return res.status(500).json({ success: false, error: playwrightResult.error || 'Failed to extract likes.' });
    }

  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await closeBrowser();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
