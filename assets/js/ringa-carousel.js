(function () {
  var stage = document.querySelector('.hero-stage');
  if (!stage) return;

  var slides = Array.prototype.slice.call(stage.querySelectorAll('.hero-slide'));
  if (slides.length < 2) return;

  var wrap = stage.querySelector('.hero-slides');
  var dotsWrap = stage.querySelector('.hc-dots');
  var cap = stage.querySelector('.hero-cap');
  var playBtn = stage.querySelector('.hc-play');
  var prevBtn = stage.querySelector('.hc-prev');
  var nextBtn = stage.querySelector('.hc-next');
  var index = 0;
  var timer = null;
  var playing = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function captionOf(slide, number) {
    return slide.dataset.caption || ('Photo ' + number);
  }

  var dots = slides.map(function (slide, position) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'hc-dot';
    button.setAttribute('aria-label', 'Show photo ' + (position + 1) + ': ' + captionOf(slide, position + 1));
    button.addEventListener('click', function () {
      show(dots.indexOf(button));
      start();
    });
    if (dotsWrap) dotsWrap.appendChild(button);
    return button;
  });

  function show(number) {
    if (!slides.length) return;
    index = (number + slides.length) % slides.length;
    slides.forEach(function (slide, position) {
      var active = position === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    dots.forEach(function (dot, position) {
      dot.setAttribute('aria-current', position === index ? 'true' : 'false');
    });
    if (cap) cap.textContent = captionOf(slides[index], index + 1);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (playing && !document.hidden && slides.length > 1) {
      timer = setInterval(function () {
        show(index + 1);
      }, 5000);
    }
  }

  function setPlaying(value) {
    playing = value;
    if (playBtn) {
      playBtn.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
      playBtn.classList.toggle('is-paused', !playing);
    }
    if (wrap) wrap.setAttribute('aria-live', playing ? 'off' : 'polite');
    start();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      show(index - 1);
      start();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      show(index + 1);
      start();
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      setPlaying(!playing);
    });
  }

  stage.addEventListener('mouseenter', stop);
  stage.addEventListener('mouseleave', start);
  stage.addEventListener('focusin', stop);
  stage.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });
  stage.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') {
      show(index - 1);
      start();
    }
    if (event.key === 'ArrowRight') {
      show(index + 1);
      start();
    }
  });

  var startX = null;
  stage.addEventListener('touchstart', function (event) {
    startX = event.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', function (event) {
    if (startX === null) return;
    var distance = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(distance) > 40) {
      show(distance < 0 ? index + 1 : index - 1);
      start();
    }
  });

  slides.slice().forEach(function (slide, position) {
    var image = slide.querySelector('img');
    var dot = dots[position];
    if (!image) return;

    function drop() {
      var removed = slides.indexOf(slide);
      if (removed < 0) return;
      slides.splice(removed, 1);
      dots.splice(removed, 1);
      slide.remove();
      if (dot) dot.remove();
      if (slides.length) {
        show(Math.min(index, slides.length - 1));
      } else {
        stop();
      }
    }

    image.addEventListener('error', drop);
    if (image.complete && image.naturalWidth === 0) drop();
  });

  show(0);
  setPlaying(playing);
})();
