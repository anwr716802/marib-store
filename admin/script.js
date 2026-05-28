// ==================== الإعدادات ====================
const API_BASE = 'https://script.google.com/macros/s/AKfycbw1aZPfaqW3ALAG7mmiDxMqfJJzLf-Nj-WOj3GScHzQ84l7PmPPK_0wg3_wP-pvc-NIzw/exec'; // استبدل
const API_KEY = 'mySecretKey123XYZ'; // مفتاح الأمان
const CLOUD_NAME = 'dxjzks7xl'; // استبدل
const UPLOAD_PRESET = 'myupload';

// التحقق من تسجيل الدخول
if (!sessionStorage.getItem('adminAuth')) {
    window.location.href = 'login.html';
}

// ==================== التنقل بين الألسنة ====================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + tabName).style.display = 'block';
    event.target.classList.add('active');
    // تحميل بيانات التبويب عند التفعيل
    if (tabName === 'products') loadProducts();
    else if (tabName === 'services') loadServices();
    else if (tabName === 'categories') loadCategories();
    else if (tabName === 'settings') loadSettings();
    else if (tabName === 'gallery') loadGallery();
    else if (tabName === 'pages') loadPages();
}

// ==================== وظائف عامة ====================
async function apiCall(action, params = {}, method = 'GET') {
    let url = API_BASE + '?action=' + action;
    // إضافة apiKey للإجراءات التي تحتاج تحقق
    if (['addProduct','updateProduct','deleteProduct','addService','updateService','deleteService',
         'addCategory','updateCategory','deleteCategory','updateSetting','addGalleryImage','deleteGalleryImage',
         'updatePage'].includes(action)) {
        url += '&apiKey=' + API_KEY;
    }
    if (method === 'POST') {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(params),
            headers: {'Content-Type': 'application/json'}
        });
        return response.json();
    } else {
        // GET
        const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
        const res = await fetch(url + (query ? '&' + query : ''));
        return res.json();
    }
}

function uploadImage(file, folder) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        if (folder) formData.append('folder', folder);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, true);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const prog = document.getElementById('prodUploadProgress') || document.getElementById('galleryUploadProgress');
                if (prog) { prog.style.display = 'block'; prog.value = percent; }
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject('فشل الرفع');
            }
        };
        xhr.onerror = () => reject('خطأ في الشبكة');
        xhr.send(formData);
    });
}

// ==================== المنتجات ====================
async function loadProducts() {
    const data = await apiCall('getProducts');
    const list = document.getElementById('productsList');
    if (!data || data.error) { list.innerHTML = '<p>لا توجد منتجات</p>'; return; }
    const rows = data.slice(1); // تجاهل رأس الأعمدة
    list.innerHTML = rows.map(row => `
        <div class="card">
            <img src="${row[5]}" alt="${row[1]}">
            <div class="card-info">
                <strong>${row[1]}</strong> <br> ${row[2]} - ${row[3]} ريال
            </div>
            <div class="card-actions">
                <button onclick="editProduct('${row[0]}','${row[1]}','${row[2]}','${row[3]}','${row[4]}','${row[5]}','${row[6]}')">✏️</button>
                <button onclick="deleteProduct('${row[0]}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openProductForm() {
    document.getElementById('productFormModal').style.display = 'flex';
    document.getElementById('productFormTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('prodImageUrl').value = '';
    document.getElementById('prodImagePreview').style.display = 'none';
    loadCategoriesForSelect('prodCategory');
}

function closeProductForm() {
    document.getElementById('productFormModal').style.display = 'none';
}

function editProduct(id, name, cat, price, desc, img, wa) {
    openProductForm();
    document.getElementById('prodId').value = id;
    document.getElementById('prodName').value = name;
    document.getElementById('prodCategory').value = cat;
    document.getElementById('prodPrice').value = price;
    document.getElementById('prodDesc').value = desc;
    document.getElementById('prodWhatsapp').value = wa;
    document.getElementById('prodImageUrl').value = img;
    if (img) {
        document.getElementById('prodImagePreview').src = img;
        document.getElementById('prodImagePreview').style.display = 'block';
    }
    document.getElementById('productFormTitle').textContent = 'تعديل المنتج';
}

async function deleteProduct(id) {
    if (confirm('هل أنت متأكد؟')) {
        await apiCall('deleteProduct', { id: id });
        loadProducts();
    }
}

// رفع صورة المنتج
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'uploadProdImageBtn') {
        const file = document.getElementById('prodImageFile').files[0];
        if (!file) return alert('اختر صورة');
        const category = document.getElementById('prodCategory').value;
        let folder = 'marib-store/products/other';
        if (category === 'رجالي') folder = 'marib-store/products/men';
        else if (category === 'نسائي') folder = 'marib-store/products/women';
        else if (category === 'أطفال') folder = 'marib-store/products/kids';
        else if (category === 'عروض') folder = 'marib-store/products/offers';
        uploadImage(file, folder).then(url => {
            document.getElementById('prodImageUrl').value = url;
            document.getElementById('prodImagePreview').src = url;
            document.getElementById('prodImagePreview').style.display = 'block';
        }).catch(err => alert('خطأ: ' + err));
    }
});

// حفظ المنتج
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value;
    const product = {
        name: document.getElementById('prodName').value,
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value,
        description: document.getElementById('prodDesc').value,
        image_url: document.getElementById('prodImageUrl').value,
        whatsapp: document.getElementById('prodWhatsapp').value
    };
    if (!product.image_url) return alert('الرجاء رفع صورة المنتج');
    if (id) {
        product.id = id;
        await apiCall('updateProduct', product, 'POST');
    } else {
        await apiCall('addProduct', product, 'POST');
    }
    closeProductForm();
    loadProducts();
});

// ==================== الخدمات (مماثل للمنتجات) ====================
// ... نفس النمط مع Services

// ==================== الأقسام ====================
async function loadCategories() {
    const data = await apiCall('getCategories');
    const list = document.getElementById('categoriesList');
    if (!data || data.error) return;
    const rows = data.slice(1);
    list.innerHTML = rows.map(row => `
        <div class="card">
            <div><strong>${row[1]}</strong> (${row[2]})</div>
            <div>
                <button onclick="editCategory('${row[0]}','${row[1]}','${row[2]}')">✏️</button>
                <button onclick="deleteCategory('${row[0]}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ... دوال النماذج

// ==================== الإعدادات ====================
async function loadSettings() {
    const data = await apiCall('getSettings');
    const container = document.getElementById('settingsFields');
    if (!data || data.error) return;
    let html = '';
    for (const [key, value] of Object.entries(data)) {
        html += `<label>${key}</label><input type="text" name="${key}" value="${value}">`;
    }
    container.innerHTML = html;
}

document.getElementById('settingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    for (const [key, value] of formData.entries()) {
        await apiCall('updateSetting', { key, value }, 'POST');
    }
    alert('تم حفظ الإعدادات');
});

// رفع الشعار
document.getElementById('uploadLogoBtn').addEventListener('click', async () => {
    const file = document.getElementById('logoFile').files[0];
    if (!file) return;
    const url = await uploadImage(file, 'marib-store/logo');
    document.getElementById('logoUrl').value = url;
    document.getElementById('logoPreview').src = url;
    document.getElementById('logoPreview').style.display = 'block';
    // حفظ الرابط في الإعدادات
    await apiCall('updateSetting', { key: 'store_logo', value: url }, 'POST');
});

// ==================== المعرض ====================
async function loadGallery() {
    const data = await apiCall('getGallery');
    const list = document.getElementById('galleryList');
    if (!data || data.error) return;
    const rows = data.slice(1);
    list.innerHTML = rows.map(row => `
        <div class="card">
            <img src="${row[2]}" alt="${row[1]}">
            <div>${row[1]}</div>
            <button onclick="deleteGalleryImage('${row[0]}')">🗑️</button>
        </div>
    `).join('');
}

// ... دوال النموذج مع رفع صورة إلى marib-store/gallery

// ==================== الصفحات ====================
async function loadPages() {
    const data = await apiCall('getPages');
    const list = document.getElementById('pagesList');
    if (!data || data.error) return;
    const rows = data.slice(1);
    list.innerHTML = rows.map(row => `
        <div class="card">
            <div><strong>${row[1]}</strong></div>
            <button onclick="editPage('${row[0]}','${row[1]}','${row[3]}','${row[4]}','${row[5]}')">تعديل المحتوى</button>
        </div>
    `).join('');
}

function editPage(id, title, slug, content, meta) {
    // عرض نموذج تعديل المحتوى (textarea كبير)
}

// ==================== تسجيل الخروج ====================
function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

// ==================== تحميل أولي ====================
showTab('products');