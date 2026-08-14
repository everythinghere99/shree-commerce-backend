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

    // YAHAN APNI COPIED API KEY DAALNI HAI (Inverted commas ke andar)
    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        // ScraperAPI ka use kar rahe hain taaki security bypass ho jaye
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        
        const { data } = await axios.get(targetUrl);
        const $ = cheerio.load(data);
        
        const title = $('title').text() || 'Product Name nahi mila';
        
        res.json({
            success: true,
            product: {
                name: title,
                url: url,
                message: "Boom! Security bypass ho gayi."
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
