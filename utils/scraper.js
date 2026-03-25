const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_FILE = path.join(__dirname, '../session.json');

async function getLikes(url) {
  let browser;
  try {
    const hasSession = fs.existsSync(SESSION_FILE);
    const launchOptions = {
      headless: true
    };

    browser = await chromium.launch(launchOptions);

    let contextOptions = {};
    if (hasSession) {
      console.log('Loading session from session.json...');
      contextOptions.storageState = SESSION_FILE;
    } else {
      console.log('No session.json found. Proceeding without authentication...');
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait 4-6 seconds to let Instagram load dynamic content
    console.log('Waiting for DOM load and rendering...');
    await page.waitForTimeout(4000); // 4 seconds delay

    console.log('Evaluating visible elements for likes text...');

    // Evaluate the DOM inside the browser page to find the specific text
    const likesText = await page.evaluate(() => {
      // Find all elements that might contain text
      // We look at typical text-containing tags in Instagram
      const elements = document.querySelectorAll('span, div, a');

      for (const el of elements) {
        // Skip hidden elements
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;

        const text = el.innerText || el.textContent;
        if (!text) continue;

        const cleanText = text.trim();

        // Match keywords: "likes" or "إعجاب"
        // Also ensure it contains at least one digit (to avoid generic strings like "See likes")
        // We also want to ensure the text is relatively short to avoid matching the entire page's text from a parent container.
        if (cleanText.length < 50 && (cleanText.toLowerCase().includes('like') || cleanText.includes('إعجاب')) && /\d/.test(cleanText)) {
          // If we found a valid likes text, let's extract the number + 'likes' text
          // e.g., "1,234 likes"
          return cleanText;
        }
      }
      return null;
    });

    if (likesText) {
      console.log(`Found likes text: "${likesText}"`);
      return { success: true, likes: likesText };
    } else {
      console.log('Could not find likes text on the page.');
      // Optionally we could retry or handle the error
      return { success: false, error: 'Could not find likes text on the page.' };
    }

  } catch (error) {
    console.error('Scraping error:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

module.exports = {
  getLikes
};
