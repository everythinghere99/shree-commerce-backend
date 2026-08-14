const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Shree Store Backend is Live!');
});

app.post('/get-details', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Sahi link daalo jisme http/https ho!' });
    }

    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        // 1. Name: Screen par sabse pehla bada text (h1)
        let title = $('h1').first().text().trim() || 'Nahi mila';
        
        // 2. Price: Screen par sabse pehla ₹ wala tag
        let price = "Nahi mila";
        $('h4, h5, span').each((i, el) => {
            const text = $(el).text().trim();
            // Sirf wahi text uthayega jo directly ₹ se shuru ho aur aage numbers hon (Jaise ₹317)
            if (text.match(/^₹\s*\d+/) && price === "Nahi mila") {
                price = text;
            }
        });

        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";

        // 3. Database se Size, Color aur Fabric (Sabse pehli entry uthayega)
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            // Exact sizes (S, M, L, XL)
            const sizeMatch = nextData.match(/"valid_sizes"\s*:\s*\[(.*?)\]/);
            if (sizeMatch && sizeMatch[1]) {
                size = sizeMatch[1].replace(/"/g, '').trim(); 
            }

            // Exact Color
            const colorMatch = nextData.match(/"color"\s*:\s*"([^"]+)"/i) || nextData.match(/"Colour"\s*:\s*"([^"]+)"/i);
            if (colorMatch && colorMatch[1]) color = colorMatch[1];

            // Exact Fabric
            const fabricMatch = nextData.match(/"fabric"\s*:\s*"([^"]+)"/i) || nextData.match(/"Material"\s*:\s*"([^"]+)"/i);
            if (fabricMatch && fabricMatch[1]) fabric = fabricMatch[1];
        }

        // 4. Fallback (Agar API block kare aur text page aaye)
        if (color === "Nahi mila" || fabric === "Nahi mila") {
            $('span, p').each((i, el) => {
                const text = $(el).text();
                if (text.includes('Color :') && color === "Nahi mila") color = text.split('Color :')[1].trim();
                if (text.includes('Fabric :') && fabric === "Nahi mila") fabric = text.split('Fabric :')[1].trim();
            });
        }

        res.json({
            success: true,
            product: {
                name: title,
                price: price,
                fabric: fabric,
                size: size,
                color: color,
                url: url,
                message: "Visual Hybrid Scan Complete! 👀"
            }
        });
    } catch (error) {
        let exactError = error.message;
        if (error.response) exactError = `ScraperAPI Issue (Status ${error.response.status}).`;
        res.status(500).json({ error: `Data laane me error aayi -> ${exactError}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
