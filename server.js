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

    // YAHAN APNI SCRAPER API KEY DAALO
    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(targetUrl);
        const $ = cheerio.load(data);
        
        // 1. Name nikalna
        const title = $('title').text() || 'Product Name nahi mila';
        
        // 2. Smart Search for Details (Size, Fabric, Color)
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        // Page ke sabhi text elements ko scan karke details dhoondna
        $('span, p, div, li').each((i, el) => {
            const text = $(el).text().trim();
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('fabric:') || lowerText.includes('material:')) {
                fabric = text.substring(0, 30); // Lamba text cut karne ke liye
            }
            if (lowerText.includes('size') && text.length < 20) {
                size = text;
            }
            if (lowerText.includes('color:') || lowerText.includes('colour:')) {
                color = text.substring(0, 20);
            }
            if (lowerText.includes('₹') && price === "Nahi mila" && text.length < 15) {
                price = text;
            }
        });
        
        res.json({
            success: true,
            product: {
                name: title,
                price: price,
                fabric: fabric,
                size: size,
                color: color,
                url: url,
                message: "Basic scan complete!"
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Bypass fail ho gaya', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
