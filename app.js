const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.tripstack.com/blog');
    await page.waitForLoadState('networkidle');

    // Assuming infinite scroll, keep scrolling until no new data is loaded
    let previousHeight;
    do {
        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(2000); // Adjust timing as needed for network conditions
    } while (previousHeight !== await page.evaluate('document.body.scrollHeight'));

    // Extract article details and image URLs
    const articles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('article[data-hook="post-list-item"]')).map(article => {
            const author = article.querySelector('[data-hook="user-name"]').textContent;
            const datePublished = article.querySelector('.post-metadata__date').textContent;
            const timeToRead = article.querySelector('[data-hook="time-to-read"]').textContent;
            const views = article.querySelector('[data-hook="view-count-compact"] span').textContent;
            const comments = article.querySelector('[data-hook="comment-count-compact"] span').textContent;
            
            // Find high-resolution image
            const imageContainer = article.closest('.gallery-item-container');
            const imageElement = imageContainer ? imageContainer.querySelector('img[data-hook="gallery-item-image-img"]') : null;
            const imageUrl = imageElement ? imageElement.src : 'No high-resolution image found';

            return { author, datePublished, timeToRead, views, comments, imageUrl };
        });
    });

    console.log(articles);
    await browser.close();
})();
