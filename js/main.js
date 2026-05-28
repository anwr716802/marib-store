// إعدادات المتجر (يتم قراءتها من URL أو من ملف الإعدادات المحلي)
const CONFIG = {
    storeName: 'متجر الأناقة للملابس',
    storeType: 'clothing',
    whatsapp: '967777777777',
    googleMaps: 'https://maps.app.goo.gl/example',
    primaryColor: '#2c3e50',
    secondaryColor: '#c0392b',
    logo: 'assets/images/logo.png',
    defaultShareImage: 'assets/images/logo.png',
    developerUrl: 'https://alshaab-contracting.com'
};

// ========== PWA Installation ==========
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) {
        installBanner.style.display = 'block';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            installBanner.style.display = 'none';
        }
    });
}

function closeInstallBanner() {
    if (installBanner) {
        installBanner.style.display = 'none';
    }
}

// ========== Menu Toggle ==========
function toggleMenu() {
    const navUl = document.querySelector('.main-nav ul');
    if (navUl) {
        navUl.classList.toggle('show');
    }
}

// ========== Toast Notification ==========
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== Load Products from Google Sheets (محاكاة) ==========
async function loadFeaturedProducts() {
    // في الواقع سيتم استبدال هذا بطلب إلى Google Sheets API
    // هنا نضع بيانات افتراضية للعرض
    const products = [
        {
            id: 1,
            name: 'قميص رجالي كلاسيك',
            category: 'رجالي',
            price: '8,500 ريال',
            image: 'assets/images/products/men.jpg',
            description: 'قميص رجالي أنيق من القطن المصري',
            whatsapp: CONFIG.whatsapp
        },
        {
            id: 2,
            name: 'فستان سهرة نسائي',
            category: 'نسائي',
            price: '12,000 ريال',
            image: 'assets/images/products/women.jpg',
            description: 'فستان سهرة فاخر بتصميم عصري',
            whatsapp: CONFIG.whatsapp
        },
        {
            id: 3,
            name: 'طقم أطفال رياضي',
            category: 'أطفال',
            price: '4,500 ريال',
            image: 'assets/images/products/kids.jpg',
            description: 'طقم رياضي مريح للأطفال',
            whatsapp: CONFIG.whatsapp
        },
        {
            id: 4,
            name: 'عرض خاص - 3 قطع ب 15,000',
            category: 'عروض',
            price: '15,000 ريال',
            image: 'assets/images/products/offers.jpg',
            description: 'عرض خاص 3 قطع متنوعة بسعر مميز',
            whatsapp: CONFIG.whatsapp
        }
    ];

    const container = document.getElementById('featuredProducts');
    if (!container) return;

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <div class="product-info">
                <span class="category">${product.category}</span>
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">${product.price}</p>
                <div class="product-actions">
                    <a href="https://wa.me/${product.whatsapp}?text=مرحباً، أريد ${product.name}" 
                       target="_blank" class="btn-whatsapp-sm">
                        واتساب
                    </a>
                    <button onclick="shareProduct('${product.name}', '${product.description}', '${product.image}', '${window.location.origin}/product.html?id=${product.id}')" class="share-btn">
                        مشاركة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== Share Functionality ==========
function shareProduct(title, description, imageUrl, productUrl) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: description,
            url: productUrl
        }).catch(() => {
            copyToClipboard(productUrl);
        });
    } else {
        copyToClipboard(productUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ الرابط للمشاركة');
    }).catch(() => {
        prompt('انسخ الرابط:', text);
    });
}

// ========== Service Worker Registration ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// ========== Page Specific Logic ==========
document.addEventListener('DOMContentLoaded', () => {
    // تحميل المنتجات المميزة
    if (document.getElementById('featuredProducts')) {
        loadFeaturedProducts();
    }

    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        const nav = document.querySelector('.main-nav ul');
        const toggle = document.querySelector('.nav-toggle');
        if (nav && nav.classList.contains('show') && !e.target.closest('.main-nav')) {
            nav.classList.remove('show');
        }
    });
});