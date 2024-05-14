const { chromium } = require('playwright');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    let articleUrls;
    try {
        articleUrls = await fetchArticleUrls();
        console.log('Fetched Article URLs:', articleUrls);
    } catch (error) {
        console.error('Failed to fetch article URLs:', error);
    }

    if (articleUrls) {
        for (const url of articleUrls) {
            try {
                await scrape(url, page);
                console.log('Scraped article:', url);
            } catch (error) {
                console.error('Failed to scrape article:', error);
            }
        }
    }

    await browser.close();
})();


async function scrape(url, page){
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await smoothScroll(page);

    const contentItems = await page.evaluate(() => {
        const items = [];
        const containers = document.querySelectorAll('.post-content__body > div'); 

        containers.forEach(container => {
            // Function to recursively handle nested elements
            function processNode(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches('p')) {
                        const text = node.innerText.trim();
                        if (text.length > 0) {
                            items.push({ type: 'text', content: text });
                        }
                    } else if (node.matches('h2')) {
                        const text = node.innerText.trim();
                        if (text.length > 0) {
                            items.push({ type: 'textHeader', content: text });
                        }
                    }

                    if (node.matches('img')) {
                        items.push({ type: 'image', src: node.src });
                    } else {
                        node.childNodes.forEach(processNode);
                    }
                }
            }

            // Start processing each container
            container.childNodes.forEach(processNode);
        });

        return items;
    });

    console.log(contentItems);

    await saveOrUpdateArticleData(url, contentItems);

};



// Function to perform smooth scrolling through the entire loaded document
async function smoothScroll(page) {
    let totalHeight = 0;
    const viewportHeight = page.viewportSize().height;
    const scrollableHeight = await page.evaluate(() => document.body.scrollHeight);

    while (totalHeight < scrollableHeight) {
        await page.evaluate((height) => window.scrollBy(0, height), viewportHeight / 4);
        totalHeight += viewportHeight / 4;

        await page.waitForTimeout(100);
    }
}

async function fetchArticleUrls() {
    const db = admin.firestore();
    const articleDataCollection = db.collection('articles');
    const querySnapshot = await articleDataCollection.get();
    const urls = [];

    querySnapshot.forEach(doc => {
        if (doc.exists && doc.data().url) {
            urls.push(doc.data().url);
        }
    });

    return urls;
}

async function saveOrUpdateArticleData(url, contentItems) {
    const articleDataCollection = db.collection('articleData');

    const querySnapshot = await articleDataCollection.where('url', '==', url).get();
    
    if (querySnapshot.empty) {
        const newDoc = articleDataCollection.doc();
        await newDoc.set({
            url: url,
            content: contentItems,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('New document created with ID:', newDoc.id);
    } else {
        querySnapshot.forEach(async (doc) => {
            await articleDataCollection.doc(doc.id).update({
                content: contentItems,
                timestamp: admin.firestore.FieldValue.serverTimestamp() // Update timestamp
            });
            console.log('Document with ID:', doc.id, 'has been updated.');
        });
    }
}



