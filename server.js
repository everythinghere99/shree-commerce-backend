const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// Ye tumhare frontend ko allow karega
app.use(cors()); 
app.use(express.json());

// Check karne ke liye ki backend chal raha hai
app.get('/', (req, res) => {
    res.send('Shree Store Backend is Live!');
});

// Main scraping logic
app.post('/get-details', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Bhai, URL bhejna zaroori hai!' });

    try {
        // Link se data nikalna
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        
        // Basic details nikalna (Isko baad me hum aur advance karenge)
        const title = $('title').text() || 'Product Name nahi mila';
        
        res.json({
            success: true,
            product: {
                name: title,
                url: url,
                message: "Basic details aa gayi hain. Colors/Sizes exact platform par depend karenge."
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Scraping me dikkat aayi', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
