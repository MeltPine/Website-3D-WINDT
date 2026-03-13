(function () {
  const root = document.documentElement;
  const gaMeasurementId = root.dataset.gaMeasurementId || '';

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
    window.gtag('config', id, {
      send_page_view: true,
    });
  }

  function track(eventName, params) {
    const payload = {
      page_path: window.location.pathname,
      ...params,
    };

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }

    // Keep visibility while running locally without analytics.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.info('[academy-track]', eventName, payload);
    }
  }

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
      } catch (error) {
        if (errorNode) {
          errorNode.textContent =
            'Senden fehlgeschlagen. Bitte erneut versuchen oder direkt per E-Mail kontaktieren.';
        }
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
    });
  }

  function setupPurchaseMarker() {
    const button = document.getElementById('markPurchaseBtn');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    button.addEventListener('click', () => {
      track('academy_purchase', {
        source: 'thank_you_demo_button',
      });
      button.textContent = 'Purchase-Event gesendet';
      button.disabled = true;
    });
  }

  loadGtag(gaMeasurementId);
  track('academy_lp_view', {
    page_name: document.title,
  });

  setupCtaTracking();
  setupLeadForm();
  setupPurchaseMarker();
})();
