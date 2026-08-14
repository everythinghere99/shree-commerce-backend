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

    // YAHAN APNI SCRAPER API KEY WAPAS DAALNA!
    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        // render=true hata diya hai taaki instant scan ho (Timeout error khatam)
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        
        // Timeout bada kar 60 seconds (60000ms) kar diya hai
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        const title = $('title').text().replace(' - Buy Online', '').trim() || 'Product Name nahi mila';
        
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        // TRICK 1: SEO Meta Tags se price nikalna (Fastest method)
        if ($('meta[property="product:price:amount"]').length) {
            price = "₹" + $('meta[property="product:price:amount"]').attr('content');
        }

        // TRICK 2: Server hang hone se bachane ke liye pure page ka ek sath text scan (Smart Regex)
        // Background JS data (jaise Meesho ka) bhi text me aa jayega
        const fullText = $('body').text().replace(/\s+/g, ' ').toLowerCase() + " " + $('script').text().toLowerCase();

        // Regex se exact words dhoondh rahe hain
        const fabricMatch = fullText.match(/fabric[\s:;=\-"]+([a-z\s]+)(?:<|"|,|\.)/i);
        if (fabricMatch && fabricMatch[1]) fabric = fabricMatch[1].substring(0, 15).trim();

        const colorMatch = fullText.match(/colou?r[\s:;=\-"]+([a-z\s]+)(?:<|"|,|\.)/i);
        if (colorMatch && colorMatch[1]) color = colorMatch[1].substring(0, 15).trim();

        const sizeMatch = fullText.match(/size[\s:;=\-"]+([a-z0-9\s,]+)(?:<|"|,|\.)/i);
        if (sizeMatch && sizeMatch[1]) size = sizeMatch[1].substring(0, 15).trim();

        // Agar price meta tag me na mile toh text se nikalna
        if (price === "Nahi mila") {
            const priceMatch = fullText.match(/₹\s*([0-9,]+)/);
            if (priceMatch) price = "₹" + priceMatch[1];
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
                message: "Instant Smart Scan Complete! 🚀"
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Data laane me error aayi', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
