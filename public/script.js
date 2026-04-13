let allDeals = [];

// Load deals on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDeals();
    setupFilters();
    setupScrollToTop();
    addCardAnimations();
});

async function loadDeals() {
    try {
        const response = await fetch('/api/deals');
        allDeals = await response.json();

        // Filter only non-posted deals for public display
        allDeals = allDeals.filter(deal => deal.status !== 'posted');

        displayDeals(allDeals);
        updateStats();
    } catch (error) {
        console.error('Error loading deals:', error);
        const grid = document.getElementById('dealsGrid');
        grid.textContent = 'Failed to load deals. Please try again later.';
    }
}

function displayDeals(deals) {
    const grid = document.getElementById('dealsGrid');
    grid.innerHTML = ''; // Clear existing content

    if (deals.length === 0) {
        const message = document.createElement('div');
        message.className = 'loading';
        message.textContent = 'No deals found. Check back soon! 🔄';
        grid.appendChild(message);
        return;
    }

    deals.forEach(deal => {
        const card = createDealCard(deal);
        grid.appendChild(card);
    });

    // Re-trigger animations for new cards
    setTimeout(() => addCardAnimations(), 100);
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

        displayDeals(filtered);
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
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all deal cards
    const cards = document.querySelectorAll('.deal-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}
