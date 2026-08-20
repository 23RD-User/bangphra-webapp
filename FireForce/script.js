/* ============================================================
   script.js — เทศบาลตำบลบางพระ
   โหลดทุกหน้า — ฟังก์ชันทำงานเฉพาะเมื่อพบ element ที่เกี่ยวข้อง
   ============================================================ */

/* 0. SCRIPT_URL กลาง — จุดเดียวสำหรับทุกหน้า
   แก้ URL ตรงนี้ที่เดียว ไม่ต้องไล่แก้ทุกไฟล์ */
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzfr1v1kHo2Tq14MnabWE1_L8WE3BlHuj03b_3PzykhyMQJC9PRgsRJKNz6mNJMJriE8Q/exec';

/* 0.1 fetchWithTimeout — ครอบ fetch() ให้ยกเลิกอัตโนมัติถ้าช้าเกินไป
   ป้องกันปัญหาเน็ตช้า/สะดุดแล้วหน้าเว็บค้างรอไม่จบ
   ใช้แทน fetch() ตรงๆ ทุกจุดที่เรียก SCRIPT_URL: fetchWithTimeout(url, options, timeoutMs)
   timeoutMs default 10000ms (10 วิ) — err.name === 'AbortError' คือ timeout */
function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    var controller = new AbortController();
    var timeoutId  = setTimeout(function(){ controller.abort(); }, timeoutMs);
    options = options || {};
    options.signal = controller.signal;
    return fetch(url, options).finally(function(){ clearTimeout(timeoutId); });
}

/* 1. Dark / Light Mode */
(function initTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

/* 2. Toast Notification
   ใช้: showToast('ข้อความ', 'info')
   ประเภท: 'info' | 'success' | 'error' | 'alert' | 'call' */
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var icons = {
        call   : '<i class="fa-solid fa-phone"></i>',
        alert  : '<i class="fa-solid fa-bell"></i>',
        info   : '<i class="fa-solid fa-circle-info"></i>',
        error  : '<i class="fa-solid fa-circle-exclamation"></i>',
        success: '<i class="fa-solid fa-circle-check"></i>',
    };

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    /* ✅ ใช้ textContent แทน innerHTML สำหรับ message
       ป้องกัน XSS กรณีที่ข้อความมาจาก server (เช่น json.message) */
    var iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.innerHTML = icons[type] || icons.info;

    var msgSpan = document.createElement('span');
    msgSpan.className = 'toast-msg';
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    container.appendChild(toast);

    requestAnimationFrame(function() {
        requestAnimationFrame(function() { toast.classList.add('toast-show'); });
    });

    setTimeout(function() {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
    }, 2800);
}

/* 2.1 Escape HTML — ป้องกัน XSS เวลาต้อง render ข้อความจาก Sheets
   (เช่น ชื่อผู้แจ้ง / รายละเอียดร้องเรียน) ผ่าน innerHTML
   ใช้: '<div>' + escapeHtml(userInput) + '</div>' */
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = (str === null || str === undefined) ? '' : String(str);
    return div.innerHTML;
}

/* 3. Skeleton Loader */
window.addEventListener('load', function() {
    var skeleton = document.getElementById('skeletonScreen');
    var page     = document.getElementById('pageContent');
    if (!skeleton || !page) return;

    setTimeout(function() {
        skeleton.classList.add('skeleton-fade-out');
        page.style.display       = 'flex';
        page.style.flexDirection = 'column';

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                page.style.transition = 'opacity 0.35s ease';
                page.style.opacity    = '1';
            });
        });

        skeleton.addEventListener('transitionend', function() {
            skeleton.remove();
        }, { once: true });
    }, 800);
});

/* 4. จำกัดให้กรอกได้เฉพาะตัวเลข — ใช้กับช่องเบอร์โทรที่เป็นตัวเลขล้วนแน่นอน
   วิธีใช้: ใส่ class="digits-only" ให้ input แล้วระบบจะดักกรองให้อัตโนมัติ
   (ไม่ใช้ type="tel" เป็นตัวตัดสิน เพราะบางช่อง เช่น login.html
   ใช้ type="tel" ร่วมกับการกรอกอีเมลได้ด้วยในโหมดเจ้าหน้าที่) */
function digitsOnlyValue(str) {
    return (str || '').toString().replace(/[^0-9]/g, '');
}

function restrictDigitsOnly(input) {
    if (!input) return;
    input.addEventListener('input', function() {
        var pos    = this.selectionStart;
        var before = this.value;
        var cleaned = digitsOnlyValue(before);
        if (cleaned !== before) {
            this.value = cleaned;
            var diff = before.length - cleaned.length;
            if (pos !== null) {
                var newPos = Math.max(0, pos - diff);
                this.setSelectionRange(newPos, newPos);
            }
        }
    });
}

(function autoInitDigitsOnly() {
    document.querySelectorAll('.digits-only').forEach(restrictDigitsOnly);
})();

/* 5. แสดง/ซ่อนรหัสผ่าน (หน้า Login) */
var togglePasswordBtn = document.getElementById('toggle-password');
var passwordInput     = document.getElementById('password');

if (togglePasswordBtn && passwordInput) {
    function activateToggle() {
        var isHidden       = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isHidden
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';
        togglePasswordBtn.setAttribute('aria-label', isHidden ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    }
    togglePasswordBtn.addEventListener('click', activateToggle);
    togglePasswordBtn.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); activateToggle(); }
    });
}

/* 6. ยืนยันก่อนโทร */
function confirmCall(number, name) {
    if (confirm('ยืนยันการโทรหา ' + name + '\nเบอร์: ' + number)) {
        window.location.href = 'tel:' + number;
    }
}
