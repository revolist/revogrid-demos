export function getHRLoadingOverlayHtml(label = 'Preparing rows…') {
  return `
    <div class="hr-loading-overlay" aria-live="polite">
      <div class="hr-loading-label">${label}</div>
    </div>
  `;
}
