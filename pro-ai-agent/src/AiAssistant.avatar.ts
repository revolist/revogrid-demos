const avatars = [
  {
    theme: 'light',
    src: new URL('./assets/ai-avatar-light.mp4', import.meta.url).href,
    poster: new URL('./assets/ai-avatar-light.webp', import.meta.url).href,
  },
  {
    theme: 'dark',
    src: new URL('./assets/ai-avatar-dark.mp4', import.meta.url).href,
    poster: new URL('./assets/ai-avatar-dark.webp', import.meta.url).href,
  },
];

/** Decorative welcome media; the shared chat owns mounting and disposal. */
export function renderAiWelcomeAvatar(host: HTMLElement) {
  const reducedMotion = host.ownerDocument.defaultView!.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  const videos = avatars.map(({ theme, src, poster }) => {
    const video = host.ownerDocument.createElement('video');
    video.className = `ai-view-demo__avatar ai-view-demo__avatar--${theme}`;
    video.src = src;
    video.poster = poster;
    video.width = video.height = 144;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    host.append(video);
    return video;
  });
  const updateMotion = () => {
    for (const video of videos) {
      video.autoplay = !reducedMotion.matches;
      if (reducedMotion.matches) video.pause();
      else
        void video.play().catch(() => {
          /* Poster remains if autoplay is blocked. */
        });
    }
  };
  updateMotion();
  reducedMotion.addEventListener('change', updateMotion);
  return () => {
    reducedMotion.removeEventListener('change', updateMotion);
    for (const video of videos) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }
  };
}
