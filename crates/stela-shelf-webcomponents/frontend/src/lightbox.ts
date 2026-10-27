/**
 * Image Lightbox modal (`#wiki-image-lightbox`) supporting original high-res
 * `data-original` URLs, keyboard Escape, and mobile swipe-down dismissal.
 */

const boundOverlays = new WeakSet<HTMLElement>();
const boundZoomTargets = new WeakSet<Element>();

export function openLightbox(src: string, alt = ''): void {
  const overlay = document.getElementById('wiki-image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement | null;
  const lightboxCaption = document.getElementById('lightbox-caption');
  if (!overlay || !lightboxImg) return;

  lightboxImg.src = src;
  lightboxImg.alt = alt;
  if (lightboxCaption) lightboxCaption.textContent = alt;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

export function closeLightbox(): void {
  const overlay = document.getElementById('wiki-image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement | null;
  if (!overlay) return;

  overlay.hidden = true;
  if (lightboxImg) lightboxImg.src = '';

  const peek = document.getElementById('wiki-center-peek');
  if (!peek || peek.hidden) {
    document.body.style.overflow = '';
  }
}

export function initImageLightbox(): void {
  const overlay = document.getElementById('wiki-image-lightbox');
  if (!overlay) return;

  if (!boundOverlays.has(overlay)) {
    boundOverlays.add(overlay);
    const closeBtn = overlay.querySelector('.lightbox-close');

    closeBtn?.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) closeLightbox();
    });

    let touchStartY = 0;
    let touchStartX = 0;
    overlay.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );
    overlay.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length === 1) {
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          if (deltaY > 60 && deltaY > Math.abs(deltaX) * 1.5) {
            closeLightbox();
          }
        }
      },
      { passive: true }
    );
  }

  document
    .querySelectorAll(
      'article img:not(.tm-link-icon):not(.tm-doc-icon-img), .infobox-main-img, .hero-banner-img'
    )
    .forEach((img) => {
      if (boundZoomTargets.has(img)) return;
      boundZoomTargets.add(img);
      img.addEventListener('click', () => {
        const src = img.getAttribute('data-original') || img.getAttribute('src');
        if (src) openLightbox(src, img.getAttribute('alt') || '');
      });
    });

  document.querySelectorAll('.hero-zoom-btn').forEach((btn) => {
    if (boundZoomTargets.has(btn)) return;
    boundZoomTargets.add(btn);
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.hero-banner-wrapper');
      const img = wrapper
        ? wrapper.querySelector('.hero-banner-img')
        : document.querySelector('.hero-banner-img');
      const src = img?.getAttribute('data-original') || img?.getAttribute('src');
      if (src) openLightbox(src, img?.getAttribute('alt') || 'Banner');
    });
  });
}
