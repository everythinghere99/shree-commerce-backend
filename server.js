const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => res.send('Shree Store Backend is Live!'));

app.post('/get-details', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL do!' });

    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = "Nahi mila";
        let price = "Nahi mila";
        let fabric = "Nahi mila";
        let color = "Nahi mila";
        let size = "Nahi mila";

        // 1. Raw Text Hack (Bypass all complex JSON structures)
        let fMatch = data.match(/"name"\s*:\s*"(?:Fabric|Material)"\s*,\s*"value"\s*:\s*"([^"]+)"/i);
        if (fMatch) fabric = fMatch[1];

        let cMatch = data.match(/"name"\s*:\s*"(?:Colou?r)"\s*,\s*"value"\s*:\s*"([^"]+)"/i);
        if (cMatch) color = cMatch[1];

        let sMatch = data.match(/"valid_sizes"\s*:\s*\[(.*?)\]/);
        if (sMatch) size = sMatch[1].replace(/"/g, '').trim();

        let pMatch = data.match(/"discounted_price"\s*:\s*(\d+)/) || data.match(/"price"\s*:\s*(\d+)/);
        if (pMatch) price = "₹" + pMatch[1];

        // 2. Direct Screen Scanner (Agar backend data hide ho, toh UI text read karega)
        $('span, p, div, h1, h2, h3, h4').each((i, el) => {
            let text = $(el).text().replace(/\s+/g, ' ').trim();
            let nextText = $(el).next().text().trim(); // Agar value agle element me ho

            if (text.match(/^₹\s*\d+/) && price === "Nahi mila") price = text;
            
            // Exact UI words check
            if (text === 'Fabric :' || text === 'Material :') fabric = nextText;
            else if (text.startsWith('Fabric :')) fabric = text.replace('Fabric :', '').trim();

            if (text === 'Color :' || text === 'Colour :') color = nextText;
            else if (text.startsWith('Color :')) color = text.replace('Color :', '').trim();
        });

        // 3. Guaranteed Title
        title = $('h1').first().text().trim() || $('title').text().replace(' - Buy Online', '').trim();

        res.json({
            success: true,
            product: { name: title, price, fabric, size, color, url, message: "Raw Text Scanner Applied! 🎯" }
        });

    } catch (error) {
        res.status(500).json({ error: `Data laane me error aayi -> ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running!`));
