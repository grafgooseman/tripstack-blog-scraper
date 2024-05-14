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
    await page.goto('https://www.tripstack.com/blog');
    await page.waitForLoadState('networkidle');
    
    // Dynamic waiting based on network activity
    let previousHeight, currentHeight;
    do {
        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForLoadState('networkidle');
        currentHeight = await page.evaluate('document.body.scrollHeight');
        if (previousHeight === currentHeight) {
            await page.waitForTimeout(2000);
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

    //Save to firebase
    for (const article of articles) {
        try {
            await saveArticle(article);
        } catch (error) {
            console.error(error);
        }
    }

    await browser.close();
})();


// Important considerations at scale: race conditions, rate limiting, error handling, not using bulk upload
async function saveArticle(article) {
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.where('url', '==', article.url).limit(1).get();

    if (snapshot.empty) {
        const newArticleRef = articlesRef.doc();
        await newArticleRef.set(article);
        console.log('New article saved with ID:', newArticleRef.id);
    } else {
        const doc = snapshot.docs[0];
        await doc.ref.update(article);
        console.log('Article updated with ID:', doc.id);
    }
}