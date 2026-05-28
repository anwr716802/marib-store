const CACHE_NAME = 'marib-store-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/manifest.json',
    '/assets/images/logo.png',
    '/assets/images/hero-bg.jpg',
    '/assets/images/products/men.jpg',
    '/assets/images/products/women.jpg',
    '/assets/images/products/kids.jpg',
    '/assets/images/products/offers.jpg',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
    );
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch
self.addEventListener('fetch', event => {
    // Skip for Google Sheets API calls
    if (event.request.url.includes('googleapis.com') || 
        event.request.url.includes('cloudinary.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    // Don't cache API calls
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                // For images, return a placeholder
                if (event.request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#eee" width="200" height="200"/><text fill="#999" x="50%" y="50%" text-anchor="middle">تحميل...</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
    );
});