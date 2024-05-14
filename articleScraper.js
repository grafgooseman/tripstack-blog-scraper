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

    // await page.goto('https://www.tripstack.com/post/showing-appreciation-at-tripstack');
    await page.goto('https://www.tripstack.com/post/how-to-fly-from-the-usa-to-spain-for-half-price');
    await page.waitForLoadState('networkidle');
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(1000);


      // Refining the approach to correctly identify and capture all types of content
      const contentItems = await page.evaluate(() => {
        const items = [];
        const containers = document.querySelectorAll('.post-content__body > div'); // Ensure this is the correct selector for the container of the content

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
                        // Process all child nodes recursively
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

    await browser.close();
})();
