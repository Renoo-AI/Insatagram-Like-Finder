const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Instagram...');
  await page.goto('https://www.instagram.com/accounts/login/');

  console.log('Please log in manually in the opened browser window.');
  console.log('Waiting for successful login (waiting for the home page to load)...');

  try {
    // Wait for the home page to load or a specific selector that indicates login success.
    // We'll wait until the URL changes to the main Instagram feed or wait for a specific element.
    // Using a longer timeout to give the user enough time to type in credentials and pass any 2FA.
    await page.waitForURL('https://www.instagram.com/', { timeout: 120000 });
    console.log('Login successful! Saving session...');
  } catch (error) {
    console.log('Did not detect successful login within the timeout or closed early.');
    console.log('Saving current state anyway just in case.');
  }

  await context.storageState({ path: SESSION_FILE });
  console.log(`Session saved to ${SESSION_FILE}`);

  await browser.close();
  console.log('Browser closed.');
})();
