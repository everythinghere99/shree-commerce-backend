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

    // YAHAN APNI API KEY WAPAS DAALNA MAT BHOOLNA!
    const SCRAPER_API_KEY = 'YAHAN_APNI_API_KEY_PASTE_KARO'; 

    try {
        // Yahan &render=true add kiya hai taaki JS poora load ho sake (Asli magic yahi hai)
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;
        
        // Timeout thoda badha diya hai kyunki JS load hone me time lagta hai
        const { data } = await axios.get(targetUrl, { timeout: 30000 });
        const $ = cheerio.load(data);
        
        const title = $('title').text().replace(' - Buy Online', '').trim() || 'Product Name nahi mila';
        
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        // Thoda aur deep scan kar rahe hain
        $('*').each((i, el) => {
            const text = $(el).text().trim().replace(/\s+/g, ' '); // Extra spaces hataye
            const lowerText = text.toLowerCase();
            
            if ((lowerText.includes('fabric') || lowerText.includes('material')) && text.length < 40) {
                fabric = text;
            }
            if ((lowerText.includes('size') || lowerText.match(/\b(s|m|l|xl|xxl|free size)\b/i)) && text.length < 25 && size === "Nahi mila") {
                size = text;
            }
            if ((lowerText.includes('color') || lowerText.includes('colour')) && text.length < 30) {
                color = text;
            }
            if ((lowerText.includes('₹') || lowerText.includes('rs')) && price === "Nahi mila" && text.length < 15) {
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
                message: "Deep scan complete! (With JS Rendering)"
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Deep Scan fail ho gaya (Time out ya API limit)', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
