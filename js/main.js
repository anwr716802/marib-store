// ==================== إعدادت المتجر ====================
const CONFIG = {
    storeName: 'متجر الأناقة للملابس',        
    storeType: 'clothing',
    whatsapp: '967777777777',                 
    googleMaps: 'https://maps.app.goo.gl/...',
    primaryColor: '#2c3e50',
    secondaryColor: '#c0392b',
    logo: 'assets/images/logo.png',
    defaultShareImage: 'assets/images/logo.png',
    developerUrl: 'https://sparkon-alsheb.netlify.app/' // موقع مؤسسة الشعب المقاولات العامة
};

// ==================== API Proxy ====================
const API_BASE = '/api/proxy';  

// تخزين محلي مؤقت للمنتجات لمنع الوميض والرمش أثناء التحديث التلقائي الصامت كل 30 ثانية
let localProductsCache = [];
let currentCategoryFilter = 'all';

// ==================== Menu Toggle ====================
function toggleMenu() {
    const navUl = document.querySelector('.main-nav ul');
    if (navUl) navUl.classList.toggle('show');
}

// ==================== Toast ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== نافذة تفاصيل كارت المنتج المنبثقة (Quick View Modal) ====================
function openProductModal(id) {
    const product = localProductsCache.find(p => p.id === id);
    if (!product) return;

    const modalOverlay = document.getElementById('productQuickModal');
    if (!modalOverlay) return;

    modalOverlay.innerHTML = `
        <div class="product-modal-container" onclick="event.stopPropagation()">
            <button class="modal-close-trigger" onclick="closeProductModal()">✕</button>
            <div class="modal-image-panel">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="modal-details-panel">
                <span class="modal-category">${product.category}</span>
                <h2>${product.name}</h2>
                <div class="modal-price">${product.price ? product.price + ' ريال' : ''}</div>
                <p class="modal-desc">${product.description || 'لا يوجد وصف متاح لهذا المنتج حالياً.'}</p>
                
                <div class="modal-action-buttons">
                    <a href="https://wa.me/${product.whatsapp}?text=مرحباً، أود شراء منتج: ${encodeURIComponent(product.name)}" target="_blank" class="btn-whatsapp" style="text-align:center; justify-content:center; padding:12px; border-radius:30px;">
                        طلب مباشر عبر واتساب سريع
                    </a>
                </div>
            </div>
        </div>
    `;

    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // إيقاف تمرير الصفحة الخلفية لراحة المتصفح
}

function closeProductModal() {
    const modalOverlay = document.getElementById('productQuickModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
        document.body.style.overflow = ''; // إعادة التمرير الطبيعي
    }
}

// ==================== جلب البيانات الذكي والصامت من جوجل شيت ====================
async function fetchProductsFromSheet() {
    try {
        const params = new URLSearchParams({ action: 'getProducts' });
        const response = await fetch(`${API_BASE}?${params.toString()}`);
        const data = await response.json();
        if (data.error) { console.error(data.error); return []; }
        
        const rows = data.slice(1); 
        return rows.map(row => ({
            id: row[0],
            name: row[1],
            category: row[2],
            price: row[3],
            description: row[4],
            image_url: row[5],
            whatsapp: row[6] || CONFIG.whatsapp
        }));
    } catch (err) {
        console.error('فشل جلب المنتجات:', err);
        return [];
    }
}

// دالة التحديث الصامت الذكي (تُستدعى تلقائياً كل 30 ثانية بدون تعطيل العميل)
async function smartRefreshProducts() {
    const freshProducts = await fetchProductsFromSheet();
    if (freshProducts.length === 0) return; // إن حدث فشل لا نقوم بمسح القديم

    localProductsCache = freshProducts;
    
    // بناء وتحديث الصفحة الرئيسية
    if (document.getElementById('featuredProducts')) {
        renderProductsDOM(localProductsCache, 'featuredProducts');
    }
    
    // بناء وتحديث صفحة كل المنتجات مع مراعاة الفلتر النشط حالياً
    if (document.getElementById('allProducts')) {
        let filtered = localProductsCache;
        if (currentCategoryFilter !== 'all') {
            const categoryMap = { men: 'رجالي', women: 'نسائي', kids: 'أطفال', offers: 'عروض' };
            const targetCategory = categoryMap[currentCategoryFilter] || currentCategoryFilter;
            filtered = localProductsCache.filter(p => p.category === targetCategory);
        }
        renderProductsDOM(filtered, 'allProducts');
    }
}

// حقن محتوى الكروت في الصفحة مباشرة مع تفادي إعادة بناء العناصر إذا لم تتغير
function renderProductsDOM(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:20px; color:#666;">لا توجد منتجات حالياً.</p>';
        return;
    }
    
    // الكارت مهيأ للفتح عند الضغط عليه بالكامل بفضل الـ onclick
    const newHTML = products.map(product => `
        <div class="product-card" onclick="openProductModal('${product.id}')">
            <div class="product-card-image-wrapper">
                <img src="${product.image_url}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="category">${product.category}</span>
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">${product.price ? product.price + ' ريال' : ''}</p>
                <div class="product-actions" onclick="event.stopPropagation();">
                    <a href="https://wa.me/${product.whatsapp}?text=مرحباً، أريد ${encodeURIComponent(product.name)}" target="_blank" class="btn-whatsapp-sm">واتساب</a>
                    <button onclick="shareProduct('${product.name.replace(/'/g, "\\'")}', '${product.description.replace(/'/g, "\\'")}', '${product.image_url}', '${window.location.origin}/product.html?id=${product.id}')" class="share-btn">مشاركة</button>
                </div>
            </div>
        </div>
    `).join('');

    // التحديث الصامت المقاوم للمسح أو الرمش الخاطئ
    if (container.innerHTML !== newHTML) {
        container.innerHTML = newHTML;
    }
}

// ==================== مشاركة ====================
function shareProduct(title, description, imageUrl, productUrl) {
    if (navigator.share) {
        navigator.share({ title, text: description, url: productUrl }).catch(() => copyToClipboard(productUrl));
    } else {
        copyToClipboard(productUrl);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('تم نسخ الرابط للمشاركة'))
        .catch(() => prompt('انسخ الرابط:', text));
}

// ==================== بناء وحقن الهياكل التلقائية عند تشغيل الصفحة ====================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. حقن شريط الحقوق الإخباري الدوار أعلى الموقع في كل الصفحات
    if (!document.querySelector('.ticker-wrapper')) {
        const tickerHTML = `
            <div class="ticker-wrapper">
                <a href="${CONFIG.developerUrl}" target="_blank" class="ticker-link" title="اضغط لزيارة موقع المؤسسة">
                    <div class="ticker-text">
                        🔥 تم إنشاء هذا التطبيق بواسطة الفريق التقني لدى مؤسسة الشعب للمقاولات العامة - اضغط هنا لزيارة موقعنا الإلكتروني الفاخر واكتشاف خدماتنا البرمجية والهندسية المتكاملة 🚀
                    </div>
                </a>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', tickerHTML);
    }

    // 2. حقن هيكل نافذة تفاصيل الكارت السريع (Modal overlay)
    if (!document.getElementById('productQuickModal')) {
        const modalOverlayHTML = `<div class="product-modal-overlay" id="productQuickModal" onclick="closeProductModal()"></div>`;
        document.body.insertAdjacentHTML('beforeend', modalOverlayHTML);
    }

    // 3. التحقق من إضافة زر "الرئيسية" في شريط التنقل العلوي تلقائياً إن لم يكن مكتوباً بالـ HTML لباقي الصفحات
    const navUl = document.querySelector('.main-nav ul');
    if (navUl && !navUl.querySelector('a[href="index.html"]')) {
        const homeLi = `<li><a href="index.html" class="${window.location.pathname.endsWith('index.html') || window.location.pathname === '/' ? 'active' : ''}">الرئيسية</a></li>`;
        navUl.insertAdjacentHTML('afterbegin', homeLi);
    }

    // 4. التحميل المبدئي الفوري للمنتجات وتخزينها كاش
    await smartRefreshProducts();

    // 5. ربط أزرار الفلترة في صفحة المنتجات بشكل ديناميكي من الكاش مباشرة لضمان السرعة
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentCategoryFilter = this.dataset.category;
            let filtered = localProductsCache;
            if (currentCategoryFilter !== 'all') {
                const categoryMap = { men: 'رجالي', women: 'نسائي', kids: 'أطفال', offers: 'عروض' };
                const targetCategory = categoryMap[currentCategoryFilter] || currentCategoryFilter;
                filtered = localProductsCache.filter(p => p.category === targetCategory);
            }
            renderProductsDOM(filtered, 'allProducts');
        });
    });

    // 6. تشغيل مؤقت التحديث التلقائي الصامت تماماً كل 30 ثانية (30000 مللي ثانية)
    setInterval(async () => {
        await smartRefreshProducts();
    }, 30000);

    // إغلاق القائمة المنسدلة للهواتف
    document.addEventListener('click', (e) => {
        const nav = document.querySelector('.main-nav ul');
        if (nav && nav.classList.contains('show') && !e.target.closest('.main-nav')) {
            nav.classList.remove('show');
        }
    });
});
