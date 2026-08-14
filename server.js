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

    const SCRAPER_API_KEY = 'Abca8fa189724b83e922ae92dc6dc96b'; 

    try {
        // Yahan se &country_code=in hata diya hai taaki 401 error na aaye
        const targetUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        
        const { data } = await axios.get(targetUrl, { timeout: 60000 });
        const $ = cheerio.load(data);
        
        let title = $('h1').text().trim() || $('title').text().replace(' - Buy Online', '').trim() || 'Nahi mila';
        let fabric = "Nahi mila";
        let size = "Nahi mila";
        let color = "Nahi mila";
        let price = "Nahi mila";

        const nextDataStr = $('#__NEXT_DATA__').html();
        if (nextDataStr) {
            try {
                const nextData = JSON.parse(nextDataStr);
                const mainProduct = nextData?.props?.pageProps?.initialState?.product?.details;
                
                if (mainProduct) {
                    if (mainProduct.name) title = mainProduct.name;
                    
                    if (mainProduct.discounted_price) price = "₹" + mainProduct.discounted_price;
                    else if (mainProduct.price) price = "₹" + mainProduct.price;

                    if (mainProduct.valid_sizes && Array.isArray(mainProduct.valid_sizes)) {
                        size = mainProduct.valid_sizes.join(", ");
                    }

                    const productStr = JSON.stringify(mainProduct).toLowerCase();
                    const fMatch = productStr.match(/fabric["\s:]+([a-z\s]+)["\\]/i) || productStr.match(/material["\s:]+([a-z\s]+)["\\]/i);
                    if (fMatch && fMatch[1]) fabric = fMatch[1].trim();

                    const cMatch = productStr.match(/colou?r["\s:]+([a-z\s]+)["\\]/i);
                    if (cMatch && cMatch[1]) color = cMatch[1].trim();
                }
            } catch (e) {
                console.log("JSON Error");
            }
        }

        if (price === "Nahi mila") {
            const priceText = $('h4').text() || $('h5').text();
            const pMatch = priceText.match(/₹\s*(\d+)/);
            if (pMatch) price = "₹" + pMatch[1];
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
                message: "Main Product Scan Complete! 🚀"
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
