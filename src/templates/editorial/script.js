import { initRSVPForm, initWishesLoadMore } from '../../scripts/rsvp';
import { 
  initCountdown, 
  initGiftInteractions, 
  initGalleryLightbox, 
  initVideoPlayers, 
  initRevealAnimations,
  initBackgroundAudioHandler
} from '../../scripts/template-modules';

const root = document.querySelector('body.template-editorial [data-template-root]');
const cover = root?.querySelector('[data-template-cover]');
const layout = root?.querySelector('[data-template-layout]');
const openBtn = root?.querySelector('[data-template-open]');
const song = root?.querySelector('[data-template-audio]');
const audioBtn = root?.querySelector('[data-template-audio-toggle]');
let isPlaying = false;

// Variabel YouTube Player
let ytPlayer = null;
let ytReady = false;
let ytDeferredPlay = false;

if (document.querySelector('[data-yt-bg]')) {
  // Load API secara asinkron agar tidak memblokir render
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  } else {
    document.head.appendChild(tag);
  }
}

window.onYouTubeIframeAPIReady = function() {
  const ytBgEls = document.querySelectorAll('[data-yt-bg]');
  ytBgEls.forEach(ytBgEl => {
    const videoId = ytBgEl.getAttribute('data-yt-bg');
    if (!videoId) return;
    
    const playerDiv = document.createElement('div');
    ytBgEl.appendChild(playerDiv);
    
    ytPlayer = new YT.Player(playerDiv, {
      videoId: videoId,
      playerVars: {
        'autoplay': 0,
        'controls': 0,
        'loop': 1,
        'playlist': videoId,
        'playsinline': 1,
        'mute': 1,
        'rel': 0,
        'showinfo': 0,
        'modestbranding': 1,
        'disablekb': 1
      },
      events: {
        'onReady': (event) => {
          ytReady = true;
          event.target.mute(); // pastikan mute agar bisa autoplay tanpa masalah
          if (ytDeferredPlay) {
            event.target.playVideo();
          }
        },
        'onStateChange': (event) => {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.playVideo(); // loop manual jika parameter loop bermasalah
          }
        }
      }
    });
  });
};

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if (layout instanceof HTMLElement) layout.style.display = 'none';
if (cover instanceof HTMLElement) {
  window.scrollTo(0, 0);
  document.body.classList.add('template-no-scroll', 'template-cover-active');
}

// ----------------------------------------------------
// FORCE PAUSE SEMUA VIDEO SAAT FIRST LOAD
// Mencegah autoplay bandel dari browser atau elemen lain
// ----------------------------------------------------
if (typeof document !== 'undefined') {
  document.querySelectorAll('video').forEach(v => {
    v.removeAttribute('autoplay');
    v.pause();
  });
}


openBtn?.addEventListener('click', () => {
  if (cover instanceof HTMLElement) {
    cover.classList.add('is-opening');
    setTimeout(() => {
      cover.style.display = 'none';
    }, 1600);
  }

  // Panggil synchronously agar tidak diblokir oleh browser policy (Safari/iOS user gesture requirement)
  playAutoplayVideos();

  if (layout instanceof HTMLElement) {
    layout.style.display = 'block';
    layout.style.opacity = '0';
    requestAnimationFrame(() => {
      layout.style.transition = 'opacity 1200ms ease';
      layout.style.opacity = '1';
      initSlideshows();
      initGalleryLightbox(root);
    });
  }

  document.body.classList.remove('template-no-scroll', 'template-cover-active');

  if (song instanceof HTMLAudioElement) {
    song.play().catch(() => { });
    audioBtn?.classList.add('audio-toggle--playing');
    isPlaying = true;
  }
});

initBackgroundAudioHandler(song, audioBtn);

function playAutoplayVideos() {
  const videos = Array.from(root?.querySelectorAll('video') || []);
  videos.forEach(video => {
    if (video instanceof HTMLVideoElement) {
      video.play().catch(() => {});
    }
  });

  // Mainkan YouTube background jika ada
  if (document.querySelector('[data-yt-bg]')) {
    if (ytReady && ytPlayer && typeof ytPlayer.playVideo === 'function') {
      ytPlayer.playVideo();
    } else {
      ytDeferredPlay = true; // Akan diputar saat onReady terpicu
    }
  }
}

function initSlideshows() {
  const sliders = Array.from(root?.querySelectorAll('[data-template-slider]') || []);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll('.template-slide'));
    if (slides.length <= 1) return;

    slides.forEach((slide) => {
      if (slide instanceof HTMLImageElement && slide.dataset.src && !slide.getAttribute('src')) {
        slide.src = slide.dataset.src;
      }
    });

    const firstCandidates = slides
      .map((slide, index) => ({ slide, index }))
      .filter(({ slide }) => slide instanceof HTMLElement && slide.dataset.coverSlide !== 'true');
    const randomPool = firstCandidates.length > 0 ? firstCandidates : slides.map((slide, index) => ({ slide, index }));
    let activeIndex = randomPool[Math.floor(Math.random() * randomPool.length)]?.index || 0;
    slides.forEach((slide, index) => slide.classList.toggle('is-active', index === activeIndex));
    slides[activeIndex]?.classList.add('is-active');
    if (reduceMotion) return;

    setInterval(() => {
      slides[activeIndex]?.classList.remove('is-active');
      activeIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex]?.classList.add('is-active');
    }, 7200);
  });
}

if (root) {
  initRevealAnimations(root);
  initCountdown(root);
  initVideoPlayers(root);
  initGalleryLightbox(root);
  initRSVPForm(root);
  initWishesLoadMore(root);
  initGiftInteractions(root);

  if (!cover || !openBtn || cover.style.display === 'none') {
    initSlideshows();
    playAutoplayVideos();
  }
}
