'use strict';

/* ============================================
   Dom refs
   ============================================ */
const stage = document.querySelector('[data-stage]');
const sheets = document.querySelectorAll('[data-sheet]');
const dots = document.querySelectorAll('[data-dot]');
const navLinks = document.querySelectorAll('.nav-link');
const mobileLinks = document.querySelectorAll('.mobile-link');
const prevBtn = document.querySelector('[data-prev]');
const nextBtn = document.querySelector('[data-next]');
const menuBtn = document.querySelector('[data-menu-btn]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

let currentIndex = 0;
let isAnimating = false;

/* ============================================
   IntersectionObserver
   ============================================ */
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const idx = parseInt(entry.target.dataset.index, 10);

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            sheets.forEach(s => s.classList.remove('active'));
            entry.target.classList.add('active');

            currentIndex = idx;
            updateUI(idx);
            animateSkills(entry.target);
            checkOverflow(entry.target);
        }
    });
}, {
    root: stage,
    threshold: [0.5, 0.7]
});

sheets.forEach(s => observer.observe(s));

/* ============================================
   Check if content overflows and mark scrollable
   ============================================ */
function checkOverflow(sheet) {
    const content = sheet.querySelector('.frame-content');
    if (!content) return;

    // Reset
    content.classList.remove('scrollable');

    // Check after content settles
    requestAnimationFrame(() => {
        if (content.scrollHeight > content.clientHeight + 4) {
            content.classList.add('scrollable');
        }
    });
}

/* ============================================
   UI update
   ============================================ */
function updateUI(index) {
    // Dots
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    // Top nav links
    navLinks.forEach((l, i) => l.classList.toggle('active', i === index));

    // Mobile menu links
    mobileLinks.forEach((l, i) => l.classList.toggle('active', i === index));

    // Arrows
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === sheets.length - 1;
}

/* ============================================
   Go to
   ============================================ */
function goTo(index) {
    if (index < 0 || index >= sheets.length) return;
    if (isAnimating) return;

    isAnimating = true;
    sheets[index].scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => { isAnimating = false; }, 800);

    // Close mobile menu
    closeMobileMenu();
}

/* ============================================
   Mobile menu toggle
   ============================================ */
function openMobileMenu() {
    mobileMenu.classList.add('open');
    document.body.classList.add('menu-open');
}

function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    document.body.classList.remove('menu-open');
}

menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileMenu.classList.toggle('open');
});

/* Close mobile menu when clicking outside */
document.addEventListener('click', (e) => {
    if (!mobileMenu.classList.contains('open')) return;
    if (mobileMenu.contains(e.target) || menuBtn.contains(e.target)) return;
    closeMobileMenu();
});

/* ============================================
   Arrows
   ============================================ */
prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

/* ============================================
   Dots
   ============================================ */
dots.forEach(dot => {
    dot.addEventListener('click', () => {
        const i = parseInt(dot.dataset.dot, 10);
        goTo(i);
    });
});

/* ============================================
   data-goto buttons (nav links, brand, "See Work", etc.)
   ============================================ */
document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const i = parseInt(el.dataset.goto, 10);
        if (!isNaN(i)) goTo(i);
    });
});

/* ============================================
   ⭐ FIXED SCROLL: SMART WHEEL HANDLING
   ============================================ */
let wheelLock = false;

stage.addEventListener('wheel', (e) => {
    // Get current active sheet
    const activeSheet = sheets[currentIndex];
    if (!activeSheet) return;

    const content = activeSheet.querySelector('.frame-content');
    if (!content) return;

    // Check if content can scroll internally
    const canScroll = content.scrollHeight > content.clientHeight + 4;

    if (canScroll) {
        const atTop = content.scrollTop <= 2;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 2;

        // Scrolling down inside content
        if (e.deltaY > 0 && !atBottom) {
            // Let the content scroll internally
            return;
        }

        // Scrolling up inside content
        if (e.deltaY < 0 && !atTop) {
            // Let the content scroll internally
            return;
        }
    }

    // Otherwise, handle page navigation
    e.preventDefault();
    if (wheelLock) return;

    if (Math.abs(e.deltaY) < 20) return;

    wheelLock = true;
    goTo(currentIndex + (e.deltaY > 0 ? 1 : -1));

    setTimeout(() => { wheelLock = false; }, 900);
}, { passive: false });

/* ============================================
   Keyboard
   ============================================ */
document.addEventListener('keydown', (e) => {
    // Don't hijack arrows when typing in inputs
    if (e.target.matches('input, textarea')) return;

    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        goTo(currentIndex + 1);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        goTo(currentIndex - 1);
    } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
    } else if (e.key === 'End') {
        e.preventDefault();
        goTo(sheets.length - 1);
    } else if (e.key === 'Escape') {
        closeMobileMenu();
    }
});

/* ============================================
   ⭐ FIXED TOUCH SWIPE — SMART
   ============================================ */
let touchStartY = 0;
let touchStartX = 0;
let touchStartTime = 0;

stage.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
}, { passive: true });

stage.addEventListener('touchend', (e) => {
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dt = Date.now() - touchStartTime;

    // Must be a real swipe (fast + far enough)
    if (dt > 500) return;
    if (Math.abs(dy) < 80) return;
    if (Math.abs(dy) < Math.abs(dx) * 1.5) return;

    // Check if content can scroll internally
    const activeSheet = sheets[currentIndex];
    const content = activeSheet?.querySelector('.frame-content');
    if (content && content.scrollHeight > content.clientHeight + 4) {
        const atTop = content.scrollTop <= 2;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 2;

        // Swiping down but not at top → let content scroll
        if (dy > 0 && !atTop) return;
        // Swiping up but not at bottom → let content scroll
        if (dy < 0 && !atBottom) return;
    }

    goTo(dy < 0 ? currentIndex + 1 : currentIndex - 1);
}, { passive: true });

/* ============================================
   Animate skill bars
   ============================================ */
function animateSkills(sheet) {
    const fills = sheet.querySelectorAll('.skill-fill-sketch');
    if (!fills.length) return;

    fills.forEach(f => { f.style.width = '0'; });

    requestAnimationFrame(() => {
        setTimeout(() => {
            fills.forEach(f => {
                f.style.width = f.dataset.fill + '%';
            });
        }, 350);
    });
}

/* ============================================
   Contact form
   ============================================ */
const form = document.querySelector('[data-form]');
const inputs = document.querySelectorAll('[data-input]');
const submitBtn = document.querySelector('[data-submit]');

if (form && submitBtn) {
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            submitBtn.disabled = !form.checkValidity();
        });
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        submitBtn.querySelector('span').textContent = 'Sent ✓';
        submitBtn.disabled = true;
        setTimeout(() => {
            form.reset();
            submitBtn.querySelector('span').textContent = 'Send Message';
            submitBtn.disabled = true;
        }, 1800);
    });
}

/* ============================================
   Handle window resize → re-check overflow
   ============================================ */
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        sheets.forEach(s => checkOverflow(s));
    }, 200);
});

/* ============================================
   Init
   ============================================ */
window.addEventListener('load', () => {
    sheets[0]?.classList.add('active');
    updateUI(0);
    animateSkills(sheets[0]);
    checkOverflow(sheets[0]);
});