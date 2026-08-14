const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors()); 
app.use(express.json());

app.post('/get-details', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL do!' });

    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&premium=true`;
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = "Nahi mila";
        let price = "Nahi mila";
        let fabric = "Nahi mila";
        let color = "Nahi mila";
        let size = "Nahi mila";

        // 1. Guaranteed Title & Price
        title = $('h1').first().text().trim() || $('title').text().replace(' - Buy Online', '').trim();
        const priceMatch = data.match(/"discounted_price"\s*:\s*(\d+)/) || data.match(/"price"\s*:\s*(\d+)/);
        if (priceMatch) price = "₹" + priceMatch[1];

        // 2. BRUTE-FORCE REGEX (Bypassing all website structures)
        // Extract Sizes
        const sizeMatch = data.match(/"valid_sizes"\s*:\s*\[(.*?)\]/);
        if (sizeMatch && sizeMatch[1]) size = sizeMatch[1].replace(/"/g, '').trim();

        // Extract Color
        const colorMatch = data.match(/{"name":"Colou?r","value":"([^"]+)"}/i) || data.match(/Colou?r\s*:\s*([A-Za-z\s]+)(?:<|\\n|")/i);
        if (colorMatch) color = colorMatch[1].trim();

        // Extract Fabric
        const fabricMatch = data.match(/{"name":"(?:Fabric|Material)","value":"([^"]+)"}/i) || data.match(/(?:Fabric|Material)\s*:\s*([A-Za-z\s]+)(?:<|\\n|")/i);
        if (fabricMatch) fabric = fabricMatch[1].trim();

        // 3. ULTIMATE FALLBACK: Screen Texts Scan
        if (color === "Nahi mila" || fabric === "Nahi mila") {
            const allTexts = [];
            $('span, p, h4').each((i, el) => allTexts.push($(el).text().trim()));
            
            for (let i = 0; i < allTexts.length; i++) {
                let t = allTexts[i].toLowerCase();
                
                if (t === 'color' || t === 'colour') {
                    if (color === "Nahi mila") color = allTexts[i+1];
                } else if (t.includes('color :')) {
                    if (color === "Nahi mila") color = allTexts[i].split(':')[1].trim();
                }

                if (t === 'fabric' || t === 'material') {
                    if (fabric === "Nahi mila") fabric = allTexts[i+1];
                } else if (t.includes('fabric :')) {
                    if (fabric === "Nahi mila") fabric = allTexts[i].split(':')[1].trim();
                }

                if (t.match(/^₹\s*\d+/) && price === "Nahi mila") {
                    price = allTexts[i];
                }
            }
        }

        res.json({
            success: true,
            product: { name: title, price, fabric, size, color, url, message: "Brute-Force Scan Complete 🎯" }
        });

    } catch (error) {
        res.status(500).json({ error: `Backend Error -> ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Live!`));
