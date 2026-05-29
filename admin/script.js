
// ==================== الإعدادات ====================
const API_BASE = 'https://script.google.com/macros/s/AKfycbw1aZPfaqW3ALAG7mmiDxMqfJJzLf-Nj-WOj3GScHzQ84l7PmPPK_0wg3_wP-pvc-NIzw/exec'; // ⚠️ استبدل
const API_KEY = 'mySecretKey123XYZ'; // نفس المفتاح في Code.gs
const CLOUD_NAME = 'dxjzks7xl'; // ⚠️ استبدل
const UPLOAD_PRESET = 'myupload';

// التحقق من تسجيل الدخول
if (!sessionStorage.getItem('adminAuth')) {
    window.location.href = 'login.html';
}

// ==================== التنقل بين الألسنة ====================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.style.display = 'block';
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes(tabName));
    if (activeBtn) activeBtn.classList.add('active');
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
    const securedActions = ['addProduct','updateProduct','deleteProduct',
                            'addService','updateService','deleteService',
                            'addCategory','updateCategory','deleteCategory',
                            'updateSetting','addGalleryImage','deleteGalleryImage',
                            'updatePage'];
    if (securedActions.includes(action)) {
        url += '&apiKey=' + API_KEY;
    }

    try {
        let response;
        if (method === 'POST') {
            response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
            response = await fetch(url + (query ? '&' + query : ''));
        }
        const data = await response.json();
        if (data.error) {
            console.error('API Error:', data.error);
            alert('خطأ: ' + data.error);
            return { error: data.error };
        }
        return data;
    } catch (err) {
        console.error('Network Error:', err);
        alert('فشل الاتصال بـ Google Sheets. راجع الإعدادات.');
        return { error: err.message };
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
                const prog = document.getElementById('prodUploadProgress');
                if (prog) { prog.style.display = 'block'; prog.value = percent; }
            }
        };
        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject('فشل الرفع - حالة HTTP: ' + xhr.status);
            }
        };
        xhr.onerror = () => reject('خطأ في الشبكة أثناء الرفع');
        xhr.send(formData);
    });
}

// ==================== المنتجات ====================
async function loadProducts() {
    const data = await apiCall('getProducts');
    const list = document.getElementById('productsList');
    if (!list) return;
    if (!data || data.error || !Array.isArray(data)) {
        list.innerHTML = '<p>لا توجد منتجات أو تعذر التحميل.</p>';
        return;
    }
    const rows = data.slice(1); // تجاهل رأس الأعمدة
    list.innerHTML = rows.map(row => `
        <div class="card">
            <img src="${row[5]}" alt="${row[1]}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
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
        await apiCall('deleteProduct', { id: id }, 'POST'); // نستخدم POST لتحتوي على apiKey
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

// ==================== تحميل التصنيفات للقوائم المنسدلة ====================
async function loadCategoriesForSelect(selectId) {
    const data = await apiCall('getCategories');
    const select = document.getElementById(selectId);
    if (!select || !data || data.error || !Array.isArray(data)) return;
    const rows = data.slice(1);
    select.innerHTML = rows.map(row => `<option value="${row[1]}">${row[1]}</option>`).join('');
}

// ==================== الخدمات (نفس نمط المنتجات) ====================
// ... أضف هنا دوال loadServices, openServiceForm, إلخ بنفس الطريقة
// لاحظ استخدام 'Services' في apiCall وورقة Services

// ==================== الأقسام ====================
// ... loadCategories (خاص بالجدول), addCategory, editCategory, deleteCategory

// ==================== الإعدادات ====================
async function loadSettings() {
    const data = await apiCall('getSettings');
    const container = document.getElementById('settingsFields');
    if (!container) return;
    if (!data || data.error) { container.innerHTML = '<p>تعذر تحميل الإعدادات</p>'; return; }
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
    await apiCall('updateSetting', { key: 'store_logo', value: url }, 'POST');
});

// ==================== المعرض ====================
// ... loadGallery, addGalleryImage, deleteGalleryImage

// ==================== الصفحات ====================
// ... loadPages, editPage

// ==================== تسجيل الخروج ====================
function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

// ==================== تحميل أولي ====================
showTab('products');