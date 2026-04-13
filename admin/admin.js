let allDeals = [];
let postedDeals = [];

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadDeals();
    setupScrapeButton();
});

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        document.getElementById('totalDeals').textContent = stats.totalDeals;
        document.getElementById('pendingDeals').textContent = stats.pendingDeals;
        document.getElementById('postedDeals').textContent = stats.postedDeals;
        document.getElementById('avgPrice').textContent = `$${stats.avgPrice}`;

        if (stats.lastScrape) {
            const lastScrape = new Date(stats.lastScrape);
            document.getElementById('lastScrape').textContent = `Last scrape: ${lastScrape.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadDeals() {
    try {
        const response = await fetch('/api/deals');
        allDeals = await response.json();

        const pending = allDeals.filter(d => d.status === 'pending');
        const posted = allDeals.filter(d => d.status === 'posted');

        displayPendingDeals(pending);
        displayPostedDeals(posted);
    } catch (error) {
        console.error('Error loading deals:', error);
    }
}

function displayPendingDeals(deals) {
    const list = document.getElementById('pendingDealsList');
    list.textContent = ''; // Clear safely

    if (deals.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'loading';
        emptyMsg.textContent = 'No pending deals. Click "Fetch New Deals" to scrape Amazon!';
        list.appendChild(emptyMsg);
        return;
    }

    deals.forEach(deal => {
        const item = createDealItem(deal, true);
        list.appendChild(item);
    });
}

function displayPostedDeals(deals) {
    const list = document.getElementById('postedDealsList');
    list.textContent = ''; // Clear safely

    if (deals.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'loading';
        emptyMsg.textContent = 'No posted deals yet.';
        list.appendChild(emptyMsg);
        return;
    }

    deals.forEach(deal => {
        const item = createDealItem(deal, false);
        list.appendChild(item);
    });
}

function createDealItem(deal, showActions) {
    const item = document.createElement('div');
    item.className = 'deal-item';

    const img = document.createElement('img');
    img.src = deal.imageUrl;
    img.alt = deal.name;
    img.className = 'deal-image-admin';

    const info = document.createElement('div');
    info.className = 'deal-info';

    const title = document.createElement('h3');
    title.textContent = deal.name;

    const meta = document.createElement('div');
    meta.className = 'deal-meta';

    const category = document.createElement('span');
    category.textContent = `📁 ${deal.category || 'N/A'}`;

    const rating = document.createElement('span');
    rating.textContent = `⭐ ${deal.rating || 'N/A'}`;

    const reviews = document.createElement('span');
    reviews.textContent = `💬 ${(deal.reviewCount || 0).toLocaleString()}`;

    meta.appendChild(category);
    meta.appendChild(rating);
    meta.appendChild(reviews);

    const price = document.createElement('div');
    price.className = 'deal-price-admin';
    price.textContent = `$${deal.price.toFixed(2)}`;

    info.appendChild(title);
    info.appendChild(meta);
    info.appendChild(price);

    const actions = document.createElement('div');
    actions.className = 'deal-actions';

    if (showActions) {
        const prepareBtn = document.createElement('button');
        prepareBtn.className = 'btn-success';
        prepareBtn.textContent = '📱 Prepare Post';
        prepareBtn.onclick = () => preparePost(deal);

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-secondary';
        viewBtn.textContent = '👁️ View on Amazon';
        viewBtn.onclick = () => window.open(deal.url, '_blank');

        actions.appendChild(prepareBtn);
        actions.appendChild(viewBtn);
    } else {
        const postedDate = document.createElement('div');
        postedDate.style.color = '#27ae60';
        postedDate.style.fontWeight = '600';
        postedDate.textContent = '✅ Posted';
        if (deal.postedAt) {
            const date = new Date(deal.postedAt);
            postedDate.textContent += ` on ${date.toLocaleDateString()}`;
        }
        actions.appendChild(postedDate);
    }

    item.appendChild(img);
    item.appendChild(info);
    item.appendChild(actions);

    return item;
}

function setupScrapeButton() {
    const scrapeBtn = document.getElementById('scrapeBtn');
    scrapeBtn.addEventListener('click', async () => {
        scrapeBtn.disabled = true;
        scrapeBtn.textContent = '⏳ Scraping Amazon...';

        showStatus('Fetching deals from Amazon... This may take 1-2 minutes.', 'info');

        try {
            const response = await fetch('/api/scrape', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                showStatus(`✅ Success! Found ${result.dealsCount} new deals!`, 'success');
                await loadStats();
                await loadDeals();
            } else {
                throw new Error(result.error || 'Scraping failed');
            }
        } catch (error) {
            showStatus(`❌ Error: ${error.message}`, 'error');
        } finally {
            scrapeBtn.disabled = false;
            scrapeBtn.textContent = '🔄 Fetch New Deals';
        }
    });
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('scrapeStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

async function preparePost(deal) {
    try {
        const response = await fetch(`/api/prepare-post/${deal.asin}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showPostModal(result.post);
        } else {
            alert('Failed to prepare post: ' + result.error);
        }
    } catch (error) {
        alert('Error preparing post: ' + error.message);
    }
}

function showPostModal(post) {
    const modal = document.getElementById('postModal');
    const modalBody = document.getElementById('modalBody');
    modalBody.textContent = ''; // Clear safely

    const instructions = document.createElement('div');
    instructions.style.marginBottom = '20px';
    instructions.style.padding = '15px';
    instructions.style.background = '#f0f8ff';
    instructions.style.borderRadius = '8px';

    const instructionsText = document.createElement('p');
    instructionsText.textContent = '📱 How to Post on Instagram:';
    const list = document.createElement('ol');
    ['Copy the caption below', 'Download the image', 'Open Instagram and create a new post', 'Upload the image and paste the caption', 'Click "Mark as Posted" when done'].forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        list.appendChild(li);
    });
    instructions.appendChild(instructionsText);
    instructions.appendChild(list);

    const captionLabel = document.createElement('h3');
    captionLabel.textContent = '📋 Caption (Click to Copy)';
    captionLabel.style.marginTop = '20px';

    const captionBox = document.createElement('div');
    captionBox.className = 'caption-box';
    captionBox.textContent = post.caption;
    captionBox.style.cursor = 'pointer';
    captionBox.onclick = () => {
        navigator.clipboard.writeText(post.caption);
        alert('Caption copied to clipboard!');
    };

    const imageLabel = document.createElement('h3');
    imageLabel.textContent = '🖼️ Product Image';

    const image = document.createElement('img');
    image.src = post.imagePath || post.dealUrl;
    image.className = 'modal-image';

    const downloadBtn = document.createElement('a');
    downloadBtn.href = post.imagePath;
    downloadBtn.download = post.imageFilename;
    downloadBtn.className = 'btn-primary';
    downloadBtn.textContent = '⬇️ Download Image';
    downloadBtn.style.display = 'inline-block';
    downloadBtn.style.marginRight = '10px';

    const markPostedBtn = document.createElement('button');
    markPostedBtn.className = 'btn-success';
    markPostedBtn.textContent = '✅ Mark as Posted';
    markPostedBtn.onclick = async () => {
        try {
            const response = await fetch(`/api/mark-posted/${post.dealId}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                alert('✅ Deal marked as posted!');
                modal.style.display = 'none';
                loadStats();
                loadDeals();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    modalBody.appendChild(instructions);
    modalBody.appendChild(captionLabel);
    modalBody.appendChild(captionBox);
    modalBody.appendChild(imageLabel);
    modalBody.appendChild(image);
    modalBody.appendChild(document.createElement('br'));
    modalBody.appendChild(downloadBtn);
    modalBody.appendChild(markPostedBtn);

    modal.style.display = 'flex';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}
