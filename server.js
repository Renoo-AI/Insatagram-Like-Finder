const express = require('express');
const path = require('path');
const { getLikes } = require('./utils/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/get-likes', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('https://www.instagram.com/')) {
      return res.status(400).json({ success: false, error: 'Valid Instagram URL is required.' });
    }

    console.log(`Received request for URL: ${url}`);

    // Call the scraper utility
    const result = await getLikes(url);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json({ success: false, error: result.error || 'Failed to extract likes.' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
