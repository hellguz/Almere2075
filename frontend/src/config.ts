// --- Configuration ---
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api';
export const POLLING_INTERVAL: number = 2000; // ms

// --- Gallery Configuration ---
export const GALLERY_CONFIG = {
  FALLOFF_RADIUS: 8.0,
  SCALE_CURVE: 7,
  MAX_SCALE: 3.0,
  MIN_SCALE: 1.2,
  GRID_DENSITY: 1.05,
  Z_LIFT: 2.0,
  DISTORTION_POWER: 0.8,
  DAMPING: 0.33,
};

