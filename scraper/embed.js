const cheerio = require('cheerio');
const { normalizeLikes } = require('../utils/normalize');

async function scrapeEmbed(url) {
  try {
    console.log(`[EMBED] Attempt`);

    // Ensure URL ends with trailing slash before appending embed
    const cleanUrl = url.endsWith('/') ? url : `${url}/`;
    const embedUrl = `${cleanUrl}embed/`;

    console.log(`[EMBED] Fetching ${embedUrl}`);

    // Add realistic headers so IG might render basic HTML
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      console.log(`[EMBED] Failed (HTTP Error ${response.status})`);
      return { success: false, error: `Embed fetch returned status ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for the SocialProof div inside the embed
    const socialProofText = $('.SocialProof a').text();

    if (socialProofText) {
      const number = normalizeLikes(socialProofText);
      if (number !== null) {
        console.log(`[EMBED] Success! Extracted: ${number}`);
        return { success: true, likes: number };
      } else {
        console.log(`[EMBED] Failed (Could not parse number from "${socialProofText}")`);
      }
    } else {
      console.log(`[EMBED] Failed (.SocialProof a not found in HTML)`);
    }

    return { success: false, error: 'Likes not found in embed HTML.' };

  } catch (err) {
    console.error(`[ERROR] [EMBED] ${err.message}`);
    console.log(`[EMBED] Failed`);
    return { success: false, error: err.message };
  }
}

module.exports = { scrapeEmbed };
