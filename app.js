const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.tripstack.com/blog');
    await page.waitForLoadState('networkidle');

    // Intelligent load (Dynamic waiting based on network activity)
    let previousHeight, currentHeight;
    do {
        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        // Wait for network to idle or for a timeout to ensure loading has a chance to start
        await page.waitForLoadState('networkidle');
        currentHeight = await page.evaluate('document.body.scrollHeight');
        if (previousHeight === currentHeight) {
            await page.waitForTimeout(1000);
            currentHeight = await page.evaluate('document.body.scrollHeight');
        }
    } while (previousHeight !== currentHeight);

    // Extract article details
    const articles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('article[data-hook="post-list-item"]')).map(article => {
            const author = article.querySelector('[data-hook="user-name"]').textContent;
            const datePublished = article.querySelector('.post-metadata__date').textContent;
            const timeToRead = article.querySelector('[data-hook="time-to-read"]').textContent;
            const views = article.querySelector('[data-hook="view-count-compact"] span').textContent;
            const comments = article.querySelector('[data-hook="comment-count-compact"] span').textContent;

            // Cover Image
            const imageContainer = article.closest('.gallery-item-container');
            const imageElement = imageContainer ? imageContainer.querySelector('img[data-hook="gallery-item-image-img"]') : null;
            const coverImageUrl = imageElement ? imageElement.src : null;

            // Article URL
            const linkElement = article.querySelector('[data-hook="post-title"]')?.closest('a');
            const url = linkElement ? linkElement.href : null;

            // Title
            const titleElement = article.querySelector('[data-hook="post-title"]');
            const title = titleElement ? titleElement.textContent.trim() : null;

            return { title, author, datePublished, timeToRead, views, comments, coverImageUrl, url };
        });
    });

    console.log(articles);
    await browser.close();
})();
