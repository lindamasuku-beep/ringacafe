(function () {
  'use strict';

  var data = window.ringaData || {};
  var currency = data.currency || 'R';
  var whatsapp = String(data.whatsapp || '').replace(/\D+/g, '');

  function formatPrice(value) {
    var amount = Number(value) || 0;
    var text = Math.floor(amount) === amount ? String(amount) : amount.toFixed(2);
    return currency + text;
  }

  function sastMinutes() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Johannesburg',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date());
      var hour = 0;
      var minute = 0;
      parts.forEach(function (part) {
        if (part.type === 'hour') hour = Number(part.value);
        if (part.type === 'minute') minute = Number(part.value);
      });
      return (hour * 60) + minute;
    } catch (error) {
      var now = new Date();
      var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      var sast = new Date(utc + (2 * 3600000));
      return (sast.getHours() * 60) + sast.getMinutes();
    }
  }

  function updateStoreStatus() {
    var statusEl = document.getElementById('live-status');
    var textEl = document.getElementById('status-text');
    var dotEl = document.querySelector('.visit-dot');
    if (!statusEl || !textEl || !dotEl) return;

    var open = Number(data.open);
    var close = Number(data.close);
    if (!isFinite(open)) open = 9 * 60;
    if (!isFinite(close)) close = 18 * 60;

    var minutes = sastMinutes();
    var isOpen = minutes >= open && minutes < close;
    statusEl.classList.toggle('is-closed', !isOpen);
    dotEl.style.background = isOpen ? '#276738' : '#a3472b';

    var label = isOpen ? (data.closeLabel || '18:00') : (data.openLabel || '09:00');
    var template = isOpen
      ? (data.openText || 'Open today until %s')
      : (data.closedText || 'Closed now • Opens daily at %s');
    textEl.textContent = template.replace('%s', label);
  }

  function initMenuFilter() {
    var pills = Array.prototype.slice.call(document.querySelectorAll('.filter-pill'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('.menu-group-block'));
    if (!pills.length || !groups.length) return;

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pills.forEach(function (other) {
          other.classList.remove('is-active');
          other.setAttribute('aria-pressed', 'false');
        });
        pill.classList.add('is-active');
        pill.setAttribute('aria-pressed', 'true');

        var target = pill.dataset.filter || 'all';
        groups.forEach(function (group) {
          var visible = target === 'all' || group.dataset.group === target;
          group.style.display = visible ? 'block' : 'none';
        });
      });
    });
  }

  function initOrderBuilder() {
    var mealButtons = Array.prototype.slice.call(document.querySelectorAll('.meal-opt'));
    var flavourButtons = Array.prototype.slice.call(document.querySelectorAll('.flavor-opt'));
    var sideButtons = Array.prototype.slice.call(document.querySelectorAll('.side-opt'));
    var summaryEl = document.getElementById('order-summary-text');
    var totalEl = document.getElementById('order-total-price');
    var whatsappBtn = document.getElementById('whatsapp-order-btn');
    var heatLevelEl = document.getElementById('heat-level-text');
    var heatGaugeEl = document.getElementById('heat-gauge-bar');

    if (!mealButtons.length || !summaryEl || !totalEl || !whatsappBtn) return;

    var selectedMeal = document.querySelector('.meal-opt.is-selected') || mealButtons[0];
    var selectedFlavour = document.querySelector('.flavor-opt.is-selected') || flavourButtons[0] || null;
    var state = {
      meal: selectedMeal.dataset.meal || selectedMeal.textContent.trim(),
      mealPrice: Number(selectedMeal.dataset.price) || 0,
      flavour: selectedFlavour ? (selectedFlavour.dataset.flavor || selectedFlavour.textContent.trim()) : '',
      sides: []
    };

    function applyFlavour(button) {
      if (!button) return;
      state.flavour = button.dataset.flavor || button.textContent.trim();
      if (heatLevelEl) heatLevelEl.textContent = button.dataset.heatText || '';
      if (heatGaugeEl) {
        heatGaugeEl.style.width = button.dataset.heatWidth || '0%';
        heatGaugeEl.style.background = button.dataset.heatGradient || '';
      }
    }

    function updateOrderDisplay() {
      var total = state.mealPrice + state.sides.reduce(function (sum, side) {
        return sum + side.price;
      }, 0);
      var sidesText = state.sides.length ? ' + ' + state.sides.map(function (side) {
        return side.name;
      }).join(', ') : '';
      var summary = (data.summaryTemplate || '%1$s (%2$s)%3$s')
        .replace('%1$s', state.meal)
        .replace('%2$s', state.flavour)
        .replace('%3$s', sidesText);

      totalEl.textContent = formatPrice(total);
      summaryEl.textContent = summary;

      if (whatsapp) {
        var message = (data.greeting || 'Hi Ringa Cafe, I would like to order:') + ' ' + summary +
          ' - Total: ' + formatPrice(total) + '. ' + (data.collection || '');
        whatsappBtn.href = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message);
      }
    }

    mealButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        mealButtons.forEach(function (other) {
          other.classList.remove('is-selected');
          other.setAttribute('aria-checked', 'false');
        });
        button.classList.add('is-selected');
        button.setAttribute('aria-checked', 'true');
        state.meal = button.dataset.meal || button.textContent.trim();
        state.mealPrice = Number(button.dataset.price) || 0;
        updateOrderDisplay();
      });
    });

    flavourButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        flavourButtons.forEach(function (other) {
          other.classList.remove('is-selected');
          other.setAttribute('aria-checked', 'false');
        });
        button.classList.add('is-selected');
        button.setAttribute('aria-checked', 'true');
        applyFlavour(button);
        updateOrderDisplay();
      });
    });

    sideButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var selected = button.classList.toggle('is-selected');
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        var name = button.dataset.side || button.textContent.trim();
        var price = Number(button.dataset.price) || 0;

        if (selected) {
          state.sides.push({ name: name, price: price });
        } else {
          state.sides = state.sides.filter(function (side) {
            return side.name !== name;
          });
        }
        updateOrderDisplay();
      });
    });

    document.querySelectorAll('.menu-row[data-meal-ref]').forEach(function (row) {
      if (row.classList.contains('is-sold-out')) return;
      row.style.cursor = 'pointer';
      row.setAttribute('title', 'Click to configure and order');
      row.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        var reference = (row.dataset.mealRef || '').toLowerCase();
        var match = mealButtons.find(function (button) {
          return (button.dataset.meal || '').toLowerCase().indexOf(reference) !== -1;
        });
        if (!match) return;
        match.click();
        var orderSection = document.getElementById('order');
        if (orderSection) orderSection.scrollIntoView({ behavior: 'smooth' });
      });
    });

    applyFlavour(selectedFlavour);
    updateOrderDisplay();
  }

  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('site-nav-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
      }
    });
  }

  function init() {
    updateStoreStatus();
    initMobileNav();
    initMenuFilter();
    initOrderBuilder();
    setInterval(updateStoreStatus, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
