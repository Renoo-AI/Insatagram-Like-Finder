const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { normalizeLikes } = require('../utils/normalize');

const SESSION_FILE = path.join(__dirname, '../session.json');

// Global browser and context instance
let globalBrowser = null;
let globalContext = null;

async function initBrowser() {
  if (globalBrowser && globalBrowser.isConnected()) {
    return;
  }

  if (globalBrowser) {
    console.log('[PLAYWRIGHT] Browser disconnected. Reinitializing...');
    await closeBrowser();
  }

  console.log('[PLAYWRIGHT] Initializing global browser instance...');

  globalBrowser = await chromium.launch({ headless: true });

  let contextOptions = {};
  if (fs.existsSync(SESSION_FILE)) {
    console.log('[PLAYWRIGHT] Loading session from session.json...');
    contextOptions.storageState = SESSION_FILE;
  } else {
    console.log('[PLAYWRIGHT] No session.json found. Proceeding without authentication...');
  }

  globalContext = await globalBrowser.newContext(contextOptions);
}

async function performScrape(url) {
  let page = null;
  try {
    await initBrowser();

    page = await globalContext.newPage();

    console.log(`[PLAYWRIGHT] Running`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('[PLAYWRIGHT] Waiting for DOM load and rendering...');

    try {
      // Use smart waiting for engagement text instead of hardcoded delay
      await page.waitForFunction(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('like') || text.includes('إعجاب');
      }, { timeout: 8000 });
    } catch (e) {
      console.log('[PLAYWRIGHT] Timeout waiting for engagement keywords. Proceeding to scan anyway...');
    }

    console.log('[PLAYWRIGHT] Evaluating visible elements for likes text...');

    // Evaluate the DOM inside the browser page to find the specific text
    const likesText = await page.evaluate(() => {
      // Find typical text-containing tags
      const elements = document.querySelectorAll('span, div, a');

      for (const el of elements) {
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;

        const text = el.innerText || el.textContent;
        if (!text) continue;

        const cleanText = text.trim();
        const lowerText = cleanText.toLowerCase();

        // Ensure text is relatively short (< 50 chars) to avoid matching the entire page's text from a parent container.
        if (cleanText.length < 50 && (lowerText.includes('like') || lowerText.includes('إعجاب'))) {
          // Exclude phrases that contain "like" but aren't engagement numbers
          if (lowerText.includes('you might also like') || lowerText.includes('see likes')) continue;

          // Must contain numbers near engagement context
          if (/[\d,.]+/.test(cleanText)) {
            return cleanText;
          }
        }
      }
      return null;
    });

    if (likesText) {
      const number = normalizeLikes(likesText);
      if (number !== null) {
         console.log(`[PLAYWRIGHT] Success`);
         return { success: true, likes: number };
      } else {
         console.log(`[PLAYWRIGHT] Failed (Could not parse number from "${likesText}")`);
         return { success: false, error: 'Found likes text but failed to normalize.' };
      }
    } else {
      console.log('[PLAYWRIGHT] Failed (Could not find likes text on the page)');
      return { success: false, error: 'Could not find likes text on the page.' };
    }

  } catch (error) {
    console.error(`[ERROR] [PLAYWRIGHT] ${error.message}`);
    throw error; // Rethrow to trigger retry loop
  } finally {
    if (page) {
      await page.close().catch(e => console.error(`[ERROR] [PLAYWRIGHT] Error closing page: ${e.message}`));
    }
  }
}

async function scrapePlaywright(url) {
  const MAX_RETRIES = 2;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`[PLAYWRIGHT] Attempt ${i + 1}/${MAX_RETRIES}`);
      const result = await performScrape(url);
      return result;
    } catch (error) {
      console.log(`[PLAYWRIGHT] Attempt ${i + 1} failed.`);
      if (i === MAX_RETRIES - 1) {
         return { success: false, error: error.message };
      }
    }
  }
}

// Graceful shutdown helper if needed elsewhere
async function closeBrowser() {
  if (globalBrowser) {
    console.log('[PLAYWRIGHT] Closing global browser instance...');
    await globalBrowser.close();
    globalBrowser = null;
    globalContext = null;
  }
}

module.exports = {
  scrapePlaywright,
  closeBrowser
};
