import type { HRGenerationProgress } from '../sys-data/hr.data.generator';

export function getHRProgressPercent(progress: HRGenerationProgress) {
  if (!progress.total) {
    return 0;
  }
  return Math.min(100, Math.round((progress.loaded / progress.total) * 100));
}

export function getHRLoadingDigits(progress: HRGenerationProgress) {
  return String(getHRProgressPercent(progress)).padStart(3, '0').split('');
}

export function getHRLoadingOverlayHtml(progress: HRGenerationProgress) {
  const digits = getHRLoadingDigits(progress)
    .map((digit) => `<span class="hr-loading-counter-digit">${digit}</span>`)
    .join('');

  return `
    <div class="hr-loading-overlay" aria-live="polite">
      <div class="hr-loading-counter" aria-label="${getHRProgressPercent(progress)} percent complete">
        <div class="hr-loading-counter-line">
          ${digits}
          <span class="hr-loading-counter-symbol">%</span>
        </div>
      </div>
    </div>
  `;
}
