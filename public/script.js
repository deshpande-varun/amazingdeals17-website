let allDeals = [];
let filteredDeals = [];
let displayedDeals = 0;
const DEALS_PER_BATCH = 20;
let isLoading = false;

// Load deals on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDeals();
    setupFilters();
    setupScrollToTop();
    setupInfiniteScroll();
});

async function loadDeals() {
    try {
        const response = await fetch('/api/deals');
        allDeals = await response.json();

        // Filter only non-posted deals for public display
        allDeals = allDeals.filter(deal => deal.status !== 'posted');

        // Initialize with filtered deals
        filteredDeals = allDeals;
        displayedDeals = 0;

        // Display first batch
        displayInitialDeals();
        updateStats();
    } catch (error) {
        console.error('Error loading deals:', error);
        const grid = document.getElementById('dealsGrid');
        grid.textContent = 'Failed to load deals. Please try again later.';
    }
}

function displayInitialDeals() {
    const grid = document.getElementById('dealsGrid');
    grid.innerHTML = ''; // Clear existing content

    if (filteredDeals.length === 0) {
        const message = document.createElement('div');
        message.className = 'loading';
        message.textContent = 'No deals found. Check back soon! 🔄';
        grid.appendChild(message);
        return;
    }

    // Remove loading indicator if exists
    removeLoadingIndicator();

    // Display first batch
    displayedDeals = 0;
    loadMoreDeals();
}

function loadMoreDeals() {
    if (isLoading) return;

    const grid = document.getElementById('dealsGrid');
    const startIndex = displayedDeals;
    const endIndex = Math.min(startIndex + DEALS_PER_BATCH, filteredDeals.length);

    if (startIndex >= filteredDeals.length) {
        return; // No more deals to load
    }

    isLoading = true;

    // Add deals to grid
    for (let i = startIndex; i < endIndex; i++) {
        const deal = filteredDeals[i];
        const card = createDealCard(deal);
        grid.appendChild(card);
    }

    displayedDeals = endIndex;
    isLoading = false;

    // Re-trigger animations for new cards
    setTimeout(() => addCardAnimations(), 100);

    // Add or remove loading indicator
    if (displayedDeals < filteredDeals.length) {
        addLoadingIndicator();
    } else {
        removeLoadingIndicator();
    }
}

function addLoadingIndicator() {
    // Remove existing indicator
    removeLoadingIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'load-more-indicator';
    indicator.id = 'loadMoreIndicator';

    const spinner = document.createElement('div');
    spinner.className = 'load-more-spinner';

    const text = document.createElement('div');
    text.className = 'load-more-text';
    text.textContent = 'Loading more deals...';

    indicator.appendChild(spinner);
    indicator.appendChild(text);

    const main = document.querySelector('main.container');
    main.appendChild(indicator);
}

function removeLoadingIndicator() {
    const indicator = document.getElementById('loadMoreIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function createDealCard(deal) {
    const discount = deal.originalPrice
        ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100)
        : 'HOT';

    // Create card elements safely
    const card = document.createElement('div');
    card.className = 'deal-card';
    card.onclick = () => window.open(deal.url, '_blank');

    const img = document.createElement('img');
    img.src = deal.imageUrl;
    img.alt = deal.name;
    img.className = 'deal-image';
    img.loading = 'lazy';

    const content = document.createElement('div');
    content.className = 'deal-content';

    const category = document.createElement('div');
    category.className = 'deal-category';
    category.textContent = deal.category || 'Amazon';

    const name = document.createElement('h3');
    name.className = 'deal-name';
    name.textContent = deal.name;

    const rating = document.createElement('div');
    rating.className = 'deal-rating';
    const stars = document.createElement('span');
    stars.className = 'stars';
    stars.textContent = `⭐ ${deal.rating || 'N/A'}`;
    const reviews = document.createElement('span');
    reviews.textContent = `(${(deal.reviewCount || 0).toLocaleString()} reviews)`;
    rating.appendChild(stars);
    rating.appendChild(reviews);

    const priceDiv = document.createElement('div');
    priceDiv.className = 'deal-price';
    const currentPrice = document.createElement('span');
    currentPrice.className = 'current-price';
    currentPrice.textContent = `$${deal.price.toFixed(2)}`;
    const badge = document.createElement('span');
    badge.className = 'deal-badge';
    badge.textContent = `${discount}${typeof discount === 'number' ? '%' : ''} DEAL`;
    priceDiv.appendChild(currentPrice);
    priceDiv.appendChild(badge);

    const shopBtn = document.createElement('a');
    shopBtn.href = deal.url;
    shopBtn.className = 'shop-btn';
    shopBtn.target = '_blank';
    shopBtn.textContent = '🛒 Shop Now on Amazon';
    shopBtn.onclick = (e) => e.stopPropagation();

    content.appendChild(category);
    content.appendChild(name);
    content.appendChild(rating);
    content.appendChild(priceDiv);
    content.appendChild(shopBtn);

    card.appendChild(img);
    card.appendChild(content);

    return card;
}

function updateStats() {
    const dealsCount = document.getElementById('dealsCount');
    dealsCount.textContent = `🔥 ${allDeals.length} Hot Deals Available`;

    const lastUpdate = document.getElementById('lastUpdate');
    if (allDeals.length > 0 && allDeals[0].scrapedAt) {
        const updateDate = new Date(allDeals[0].scrapedAt);
        const timeAgo = getTimeAgo(updateDate);
        lastUpdate.textContent = `🕒 Updated ${timeAgo}`;
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const priceButtons = document.querySelectorAll('.price-btn');

    let activeCategory = 'all';
    let activePriceRange = 'all';

    const applyFilters = () => {
        let filtered = [...allDeals];

        // Search filter
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(deal =>
                deal.name.toLowerCase().includes(searchTerm) ||
                (deal.category && deal.category.toLowerCase().includes(searchTerm))
            );
        }

        // Category filter
        if (activeCategory !== 'all') {
            filtered = filtered.filter(deal =>
                deal.category && deal.category.includes(activeCategory)
            );
        }

        // Price filter
        if (activePriceRange !== 'all') {
            const [min, max] = activePriceRange.split('-').map(Number);
            filtered = filtered.filter(deal =>
                deal.price >= min && deal.price <= max
            );
        }

        // Update filtered deals and reset display
        filteredDeals = filtered;
        displayInitialDeals();
    };

    // Search input listener
    searchInput.addEventListener('input', applyFilters);

    // Category button listeners
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all category buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Update active category
            activeCategory = button.dataset.category;
            // Apply filters
            applyFilters();
        });
    });

    // Price button listeners
    priceButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all price buttons
            priceButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Update active price range
            activePriceRange = button.dataset.price;
            // Apply filters
            applyFilters();
        });
    });
}

function setupScrollToTop() {
    const scrollTopBtn = document.getElementById('scrollTop');

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top when clicked
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        // Check if user scrolled near bottom
        const scrollPosition = window.innerHeight + window.pageYOffset;
        const pageHeight = document.documentElement.scrollHeight;

        // Load more when within 500px of bottom
        if (scrollPosition >= pageHeight - 500) {
            if (displayedDeals < filteredDeals.length && !isLoading) {
                loadMoreDeals();
            }
        }
    });
}

function addCardAnimations() {
    // Add entrance animations to cards as they come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 30);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all deal cards that haven't been animated yet
    const cards = document.querySelectorAll('.deal-card:not(.animated)');
    cards.forEach(card => {
        card.classList.add('animated');
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
}
