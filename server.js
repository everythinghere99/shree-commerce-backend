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
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = $('title').text().replace(' - Buy Online', '').trim() || 'Product Name nahi mila';
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        // Asli Hidden Database nikalna
        const nextData = $('#__NEXT_DATA__').html();
        
        if (nextData) {
            try {
                const jsonData = JSON.parse(nextData);
                
                // Ye function database me hamesha "First" value dhoondhega (Main Product ki)
                function findFirstKey(obj, keyToFind) {
                    let result = null;
                    function search(node) {
                        if (result !== null) return;
                        if (node !== null && typeof node === 'object') {
                            if (keyToFind in node) {
                                result = node[keyToFind];
                                return;
                            }
                            Object.values(node).forEach(search);
                        }
                    }
                    search(jsonData);
                    return result;
                }

                // 1. Exact Price nikalna (Discounted Price pehle dekhega)
                const discountedPrice = findFirstKey(jsonData, 'discounted_price');
                const normalPrice = findFirstKey(jsonData, 'price');
                
                if (discountedPrice) price = "₹" + discountedPrice;
                else if (normalPrice) price = "₹" + normalPrice;

                // 2. Exact Details (Fabric, Color) nikalna
                const detailsArray = findFirstKey(jsonData, 'details');
                if (Array.isArray(detailsArray)) {
                    detailsArray.forEach(item => {
                        const itemName = (item.name || "").toLowerCase();
                        const itemValue = item.value || item.description || "";
                        if (itemName.includes('fabric') || itemName.includes('material')) {
                            fabric = itemValue;
                        }
                        if (itemName.includes('color') || itemName.includes('colour')) {
                            color = itemValue;
                        }
                    });
                }

                // 3. Exact Size nikalna
                const sizesArray = findFirstKey(jsonData, 'valid_sizes');
                if (Array.isArray(sizesArray)) {
                    size = sizesArray.join(', '); // ["S", "M"] ko S, M bana dega
                }

            } catch (e) {
                console.log("JSON Parse Error");
            }
        }

        // Agar JSON database se nahi mila, to seedha UI se exact line uthayega
        if (color === "Nahi mila" || fabric === "Nahi mila") {
            $('span').each((i, el) => {
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
                message: "Targeted Scan Complete! 🎯"
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
