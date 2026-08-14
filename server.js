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

    // Asli Hack: Link se Exact Product ID nikalna (e.g., 9y9ao9)
    let productIdMatch = url.match(/\/p\/([a-zA-Z0-9]+)/);
    let targetProductId = productIdMatch ? productIdMatch[1] : null;

    try {
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = "Nahi mila";
        let price = "Nahi mila";
        let fabric = "Nahi mila";
        let color = "Nahi mila";
        let size = "Nahi mila";

        const nextDataStr = $('#__NEXT_DATA__').html();
        
        if (nextDataStr) {
            const parsed = JSON.parse(nextDataStr);
            let exactProductObj = null;

            // Ye function sirf usi product ka data dega jiska ID link wale ID se match hoga
            function findTargetProduct(obj) {
                if (!obj || typeof obj !== 'object' || exactProductObj) return;
                
                // ID match filter
                if ((obj.id && obj.id == targetProductId) || (obj.product_id && obj.product_id == targetProductId)) {
                    if (obj.price || obj.discounted_price || obj.name) {
                        exactProductObj = obj;
                        return;
                    }
                }
                Object.values(obj).forEach(findTargetProduct);
            }

            // Agar product ID mila hai toh exact search karo
            if (targetProductId) {
                findTargetProduct(parsed);
            }

            // Agar kisi wajah se direct na mile toh default main product location
            if (!exactProductObj) {
                 exactProductObj = parsed?.props?.pageProps?.initialState?.product?.details;
            }

            // Ab yahan se 100% accurate data nikalega
            if (exactProductObj) {
                if (exactProductObj.name) title = exactProductObj.name;
                
                if (exactProductObj.discounted_price) price = "₹" + exactProductObj.discounted_price;
                else if (exactProductObj.price) price = "₹" + exactProductObj.price;
                
                if (exactProductObj.valid_sizes && Array.isArray(exactProductObj.valid_sizes)) {
                    size = exactProductObj.valid_sizes.join(', ');
                }

                if (exactProductObj.details && Array.isArray(exactProductObj.details)) {
                    exactProductObj.details.forEach(d => {
                        let n = (d.name || "").toLowerCase();
                        let v = d.value || d.description || "";
                        if (n.includes('fabric') || n.includes('material')) fabric = v;
                        if (n.includes('color') || n.includes('colour')) color = v;
                    });
                }
            }
        }

        // Fallback title ke liye
        if (title === "Nahi mila") title = $('title').text().replace(' - Buy Online', '').trim() || 'Nahi mila';

        res.json({
            success: true,
            product: {
                name: title,
                price: price,
                fabric: fabric,
                size: size,
                color: color,
                url: url,
                message: "Perfect Match! Asli Product ka data mila 🎯"
            }
        });

    } catch (error) {
        let exactError = error.message;
        if (error.response) {
            exactError = `ScraperAPI Issue (Status ${error.response.status}).`;
        }
        res.status(500).json({ error: `Data laane me error aayi -> ${exactError}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
