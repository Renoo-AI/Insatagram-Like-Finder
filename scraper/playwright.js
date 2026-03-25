const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { normalizeLikes } = require('../utils/normalize');

const SESSION_FILE = path.join(__dirname, '../session.json');

// Global browser and context instance
let globalBrowser = null;
let globalContext = null;

async function initBrowser() {
  if (globalBrowser) return;
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

async function scrapePlaywright(url) {
  let page = null;
  try {
    await initBrowser();

    page = await globalContext.newPage();

    console.log(`[PLAYWRIGHT] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('[PLAYWRIGHT] Waiting for DOM load and rendering...');
    await page.waitForTimeout(4000); // 4 seconds delay for dynamic content to render

    console.log('[PLAYWRIGHT] Evaluating visible elements for likes text...');

    // Evaluate the DOM inside the browser page to find the specific text
    const likesText = await page.evaluate(() => {
      // Find typical text-containing tags
      const elements = document.querySelectorAll('span, div, a');

      for (const el of elements) {
        // Skip hidden elements or those with no children to ensure we hit leaf nodes
        // Alternatively, checking text content length is a simpler proxy for leaf nodes vs wrapper nodes
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;

        const text = el.innerText || el.textContent;
        if (!text) continue;

        const cleanText = text.trim();

        // Ensure text is relatively short (< 50 chars) to avoid matching the entire page's text from a parent container.
        if (cleanText.length < 50 &&
            (cleanText.toLowerCase().includes('like') || cleanText.includes('إعجاب')) &&
            /\d/.test(cleanText)) {
          return cleanText;
        }
      }
      return null;
    });

    if (likesText) {
      console.log(`[PLAYWRIGHT] Found raw likes text: "${likesText}"`);
      const number = normalizeLikes(likesText);
      if (number !== null) {
         console.log(`[PLAYWRIGHT] Success! Extracted: ${number}`);
         return { success: true, likes: number };
      } else {
         console.log(`[PLAYWRIGHT] Could not parse number from "${likesText}"`);
         return { success: false, error: 'Found likes text but failed to normalize.' };
      }
    } else {
      console.log('[PLAYWRIGHT] Could not find likes text on the page.');
      return { success: false, error: 'Could not find likes text on the page.' };
    }

  } catch (error) {
    console.error('[PLAYWRIGHT] Scraping error:', error);
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close().catch(e => console.error('[PLAYWRIGHT] Error closing page:', e));
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
