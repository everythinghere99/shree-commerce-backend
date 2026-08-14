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

    // YAHAN APNI SCRAPER API KEY WAPAS DAAL LENA!
    const SCRAPER_API_KEY = 'abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        
        // Timeout 60 sec rakha hai
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = $('title').text().replace(' - Buy Online', '').trim() || 'Product Name nahi mila';
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        // TRICK 1: Meesho & Modern Sites ka Hidden "Next.js" Data nikalna (No Reviews, No Ads)
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            // Asli discounted price dhoondhna
            const priceMatch = nextData.match(/"discounted_price"\s*:\s*(\d+)/) || nextData.match(/"price"\s*:\s*(\d+)/);
            if (priceMatch) price = "₹" + priceMatch[1];

            // Fabric / Material dhoondhna
            const fabricMatch = nextData.match(/"(?:Fabric|Material)"\s*:\s*"([^"]+)"/i) || nextData.match(/Fabric\s*:\s*([A-Za-z\s]+)(?:\\n|")/i);
            if (fabricMatch) fabric = fabricMatch[1].trim();

            // Color dhoondhna
            const colorMatch = nextData.match(/"(?:Color|Colour)"\s*:\s*"([^"]+)"/i) || nextData.match(/Color\s*:\s*([A-Za-z\s]+)(?:\\n|")/i);
            if (colorMatch) color = colorMatch[1].trim();

            // Exact Sizes dhoondhna (e.g., ["S","M","L"])
            const sizeMatch = nextData.match(/"valid_sizes"\s*:\s*\[(.*?)\]/);
            if (sizeMatch && sizeMatch[1]) {
                size = sizeMatch[1].replace(/"/g, '').trim(); // "S","M" ko S,M bana dega
            }
        }

        // TRICK 2: Amazon/Myntra ke liye Schema Data (Fallback)
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                let product = Array.isArray(json) ? json.find(x => x['@type'] === 'Product') : json;
                
                if (product && product['@type'] === 'Product') {
                    if (product.name && title === 'Product Name nahi mila') title = product.name;
                    if (product.offers && product.offers.price && price === "Nahi mila") price = "₹" + product.offers.price;
                    if (product.color && color === "Nahi mila") color = product.color;
                }
            } catch (e) {}
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
                message: "Asli Database Hack Complete! 🔥"
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
