(function () {
  const CONSENT_KEY = 'academy-analytics-consent';
  const root = document.documentElement;
  const gaMeasurementId = root.dataset.gaMeasurementId || '';
  let analyticsEnabled = false;

  /* ── Consent ────────────────────────────────────────────────── */

  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY) || 'unset';
    } catch {
      return 'unset';
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Ignore storage write failures.
    }
  }

  /* ── GA4 / gtag ─────────────────────────────────────────────── */

  function loadGtag(id) {
    if (!id || document.querySelector('script[data-academy-gtag="1"]')) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.dataset.academyGtag = '1';
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: true });
    analyticsEnabled = true;
  }

  function track(eventName, params) {
    const payload = {
      page_path: window.location.pathname,
      site_id: root.dataset.siteId || 'academy-growth-site',
      ...params,
    };

    if (analyticsEnabled && typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.info('[academy-track]', eventName, payload);
    }
  }

  /* ── Cookie Consent Banner ──────────────────────────────────── */

  function setupConsentBanner() {
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    const rejectBtn = document.getElementById('cookieReject');

    const consentState = readConsent();

    if (consentState === 'granted') {
      loadGtag(gaMeasurementId);
      if (banner) {
        banner.remove();
      }
      return;
    }

    if (consentState === 'denied') {
      analyticsEnabled = false;
      if (banner) {
        banner.remove();
      }
      return;
    }

    if (!banner || !(acceptBtn instanceof HTMLButtonElement) || !(rejectBtn instanceof HTMLButtonElement)) {
      return;
    }

    acceptBtn.addEventListener('click', () => {
      writeConsent('granted');
      loadGtag(gaMeasurementId);
      track('academy_cta_click', { cta: 'cookie_accept' });
      banner.remove();
    });

    rejectBtn.addEventListener('click', () => {
      writeConsent('denied');
      analyticsEnabled = false;
      track('academy_cta_click', { cta: 'cookie_reject' });
      banner.remove();
    });
  }

  /* ── CTA Tracking ───────────────────────────────────────────── */

  function setupCtaTracking() {
    document.querySelectorAll('[data-track-cta]').forEach((element) => {
      element.addEventListener('click', () => {
        const cta = element.getAttribute('data-track-cta') || 'unknown';
        track('academy_cta_click', { cta });

        if (element.hasAttribute('data-track-checkout')) {
          const source = element.getAttribute('data-track-checkout') || 'unknown';
          track('academy_checkout_start', { source });
        }
      });
    });
  }

  /* ── Lead Form ──────────────────────────────────────────────── */

  function setupLeadForm() {
    const form = document.getElementById('academyLeadForm');
    const errorNode = document.getElementById('academyFormError');

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (errorNode) {
        errorNode.textContent = '';
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Wird gesendet…';
      }

      const formData = new FormData(form);

      try {
        const response = await fetch('/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Lead submit failed');
        }

        track('academy_lead_submit', {
          form_name: 'academy-lead',
        });

        window.location.href = './thank-you.html';
      } catch {
        if (errorNode) {
          errorNode.textContent =
            'Senden fehlgeschlagen. Bitte erneut versuchen oder direkt per E-Mail kontaktieren.';
        }
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.textContent = 'Anfrage senden';
        }
      }
    });
  }

  /* ── Purchase Marker (Thank-You Page) ───────────────────────── */

  function setupPurchaseMarker() {
    const button = document.getElementById('markPurchaseBtn');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener('click', () => {
      track('academy_purchase', {
        source: 'thank_you_demo_button',
      });
      button.textContent = 'Purchase-Event gesendet ✓';
      button.disabled = true;
    });
  }

  /* ── Scroll Reveal (IntersectionObserver) ────────────────────── */

  function setupScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length === 0) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  /* ── Sticky Header Scroll State ─────────────────────────────── */

  function setupStickyHeader() {
    const header = document.getElementById('siteHeader');
    if (!header) {
      return;
    }

    let ticking = false;
    const scrollThreshold = 60;

    function updateHeader() {
      if (window.scrollY > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });

    updateHeader();
  }

  /* ── Smooth Scroll for Anchor Links ─────────────────────────── */

  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') {
          return;
        }

        const target = document.querySelector(targetId);
        if (!target) {
          return;
        }

        e.preventDefault();

        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      });
    });
  }

  /* ── Counter Animation (Proof Section) ──────────────────────── */

  function setupCounterAnimation() {
    const counters = document.querySelectorAll('[data-counter]');
    if (counters.length === 0) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((counter) => observer.observe(counter));
  }

  function animateCounter(element) {
    const finalText = element.getAttribute('data-counter') || element.textContent;
    const match = finalText.match(/([+-]?)(\d+\.?\d*)(.*)/);

    if (!match) {
      return;
    }

    const prefix = match[1];
    const targetNum = parseFloat(match[2]);
    const suffix = match[3];
    const hasDecimal = match[2].includes('.');
    const duration = 1600;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;

      if (hasDecimal) {
        element.textContent = `${prefix}${current.toFixed(1)}${suffix}`;
      } else {
        element.textContent = `${prefix}${Math.round(current)}${suffix}`;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = finalText;
      }
    }

    element.textContent = `${prefix}0${suffix}`;
    requestAnimationFrame(update);
  }

  /* ── Initialisation ─────────────────────────────────────────── */

  setupConsentBanner();
  setupCtaTracking();
  setupLeadForm();
  setupPurchaseMarker();
  setupScrollReveal();
  setupStickyHeader();
  setupSmoothScroll();
  setupCounterAnimation();

  track('academy_lp_view', {
    page_name: document.title,
  });
})();
