
// ==================== الإعدادات - ضع قيمك هنا ====================
const API_BASE = '/api/proxy'; // يستخدم الدالة الوسيطة على Vercel
const API_KEY = 'mySecretKey123XYZ'; // نفس المفتاح في Code.gs
const CLOUD_NAME = 'dxjzks7xl'; // Cloudinary Cloud Name
const UPLOAD_PRESET = 'myupload'; // Cloudinary Upload Preset (unsigned)
// =================================================================

// التحقق من الجلسة
if (!sessionStorage.getItem('adminAuth')) {
    window.location.href = 'login.html';
}

// ==================== نظام Debug ====================
const debugMessages = [];
function addDebug(msg, type = 'info') {
    const entry = { msg, type, time: new Date() };
    debugMessages.push(entry);
    if (debugMessages.length > 5) debugMessages.shift();
    console.log(`[${type.toUpperCase()}] ${msg}`);
    renderDebug();
}
function renderDebug() {
    const area = document.getElementById('debugArea');
    if (!area) return;
    area.innerHTML = debugMessages.map(e =>
        `<div class="debug-entry debug-${e.type}">[${e.time.toLocaleTimeString()}] ${e.msg}</div>`
    ).join('');
}
function toggleDebug() {
    const area = document.getElementById('debugArea');
    if (area.style.display === 'block') {
        area.style.display = 'none';
        document.getElementById('debugToggle').textContent = 'إظهار سجل التصحيح';
    } else {
        area.style.display = 'block';
        document.getElementById('debugToggle').textContent = 'إخفاء سجل التصحيح';
    }
}
addDebug('تم تحميل لوحة التحكم', 'info');

// ==================== التنقل بين الألسنة ====================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.style.display = 'block';
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes(tabName));
    if (activeBtn) activeBtn.classList.add('active');
    if (tabName === 'products') loadProducts();
    // ... (باقي التحميلات)
}

// ==================== apiCall (GET فقط لتجنب CORS preflight) ====================
async function apiCall(action, params = {}) {
    // بناء URL
    let url = API_BASE + '?action=' + action;
    // إضافة apiKey للإجراءات الحساسة
    const secured = ['addProduct','updateProduct','deleteProduct',
                     'addService','updateService','deleteService',
                     'addCategory','updateCategory','deleteCategory',
                     'updateSetting','addGalleryImage','deleteGalleryImage',
                     'updatePage'];
    if (secured.includes(action)) {
        params.apiKey = API_KEY;
    }
    // تحويل params إلى query string
    const query = Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');
    if (query) url += '&' + query;

    addDebug(`إرسال طلب: ${action}`, 'info');
    try {
        const response = await fetch(url);
        const text = await response.text();
        addDebug(`استجابة (${response.status}): ${text}`, 'info');
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            addDebug(`فشل تحليل JSON: ${text}`, 'error');
            return { error: 'استجابة غير JSON: ' + text };
        }
        if (data.error) {
            addDebug(`خطأ API: ${data.error}`, 'error');
            return data;
        }
        addDebug(`نجاح: ${JSON.stringify(data)}`, 'success');
        return data;
    } catch (err) {
        addDebug(`فشل شبكة: ${err.message}`, 'error');
        return { error: err.message };
    }
}

// ==================== رفع الصور إلى Cloudinary ====================
function uploadImage(file, folder) {
    addDebug(`بدء رفع: ${file.name} (${file.size} bytes) إلى ${folder}`, 'info');
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
                addDebug(`رفع ناجح: ${data.secure_url}`, 'success');
                resolve(data.secure_url);
            } else {
                addDebug(`فشل رفع: ${xhr.status} ${xhr.responseText}`, 'error');
                reject('فشل الرفع - حالة HTTP: ' + xhr.status);
            }
        };
        xhr.onerror = () => {
            addDebug('خطأ شبكة أثناء الرفع', 'error');
            reject('خطأ في الشبكة');
        };
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
    const rows = data.slice(1); // تجاهل الصف الأول (الرؤوس)
    list.innerHTML = rows.map(row => `
        <div class="card">
            <img src="${row[5]}" alt="${row[1]}">
            <div class="card-info"><strong>${row[1]}</strong><br>${row[2]} - ${row[3]} ريال</div>
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
        const res = await apiCall('deleteProduct', { id });
        if (!res.error) loadProducts();
    }
}

// رفع صورة المنتج
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'uploadProdImageBtn') {
        const fileInput = document.getElementById('prodImageFile');
        const files = fileInput.files;
        addDebug(`عدد الملفات المختارة: ${files.length}`, 'info');
        if (files.length === 0) {
            alert('اختر صورة');
            return;
        }
        const file = files[0];
        const category = document.getElementById('prodCategory').value;
        let folder = 'marib-store/products/other';
        if (category === 'رجالي') folder = 'marib-store/products/men';
        else if (category === 'نسائي') folder = 'marib-store/products/women';
        else if (category === 'أطفال') folder = 'marib-store/products/kids';
        else if (category === 'عروض') folder = 'marib-store/products/offers';
        addDebug(`المجلد المستهدف: ${folder}`, 'info');
        uploadImage(file, folder).then(url => {
            document.getElementById('prodImageUrl').value = url;
            document.getElementById('prodImagePreview').src = url;
            document.getElementById('prodImagePreview').style.display = 'block';
            addDebug(`تم تعيين رابط الصورة: ${url}`, 'success');
        }).catch(err => {
            alert('خطأ: ' + err);
        });
    }
});

// حفظ المنتج
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const product = {
        name: document.getElementById('prodName').value.trim(),
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value.trim(),
        description: document.getElementById('prodDesc').value.trim(),
        image_url: document.getElementById('prodImageUrl').value.trim(),
        whatsapp: document.getElementById('prodWhatsapp').value.trim()
    };
    const id = document.getElementById('prodId').value;
    if (id) product.id = id;

    addDebug(`البيانات المعدة للإرسال: ${JSON.stringify(product)}`, 'info');
    if (!product.name) {
        addDebug('اسم المنتج فارغ', 'error');
        alert('الرجاء إدخال اسم المنتج');
        return;
    }
    if (!product.image_url) {
        addDebug('رابط الصورة فارغ', 'error');
        alert('الرجاء رفع صورة المنتج');
        return;
    }
    if (!product.category) {
        addDebug('التصنيف غير محدد', 'error');
        alert('الرجاء اختيار تصنيف');
        return;
    }

    const action = id ? 'updateProduct' : 'addProduct';
    const res = await apiCall(action, product);
    if (!res.error) {
        addDebug('تم الحفظ بنجاح', 'success');
        closeProductForm();
        loadProducts();
    }
});

// تحميل التصنيفات للقائمة المنسدلة
async function loadCategoriesForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // التصنيفات الافتراضية في حالة عدم وجود بيانات
    const defaultCategories = [
        { name: 'رجالي', slug: 'men' },
        { name: 'نسائي', slug: 'women' },
        { name: 'أطفال', slug: 'kids' },
        { name: 'عروض', slug: 'offers' }
    ];

    try {
        const data = await apiCall('getCategories');
        if (data && !data.error && Array.isArray(data) && data.length > 1) {
            // نجح الجلب ويوجد صفوف بعد صف الرؤوس
            const rows = data.slice(1);
            const categories = rows.map(row => ({ name: row[1], slug: row[2] }));
            populateSelect(select, categories);
            addDebug('تم تحميل التصنيفات من Google Sheets', 'success');
            return;
        }
    } catch (err) {
        addDebug('فشل جلب التصنيفات، استخدام الافتراضية: ' + err.message, 'error');
    }

    // استخدام التصنيفات الافتراضية
    populateSelect(select, defaultCategories);
    addDebug('تم استخدام التصنيفات الافتراضية', 'info');
}

function populateSelect(select, categories) {
    select.innerHTML = categories.map(cat => 
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
}

// ==================== باقي الأقسام (اختصار، يمكنك إضافتها لاحقًا) ====================
// ستتبع نفس نمط المنتجات مع apiCall.

// تسجيل الخروج
function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'login.html';
}

// تحميل أولي
showTab('products');