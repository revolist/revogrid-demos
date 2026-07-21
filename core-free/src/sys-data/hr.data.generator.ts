export interface HRGenerationProgress {
  loaded: number;
  total: number;
}

export interface HRGenerationOptions {
  signal?: AbortSignal;
  onProgress?: (progress: HRGenerationProgress) => void;
}
