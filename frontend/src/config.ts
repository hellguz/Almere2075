// --- Configuration ---
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api';
export const POLLING_INTERVAL: number = 2000; // ms

/**
 * Checks if the current device is likely a mobile device based on screen width.
 * @returns {boolean} True if the screen width is 768px or less.
 */
const isMobile = (): boolean => {
    // A common breakpoint for mobile devices
    return window.innerWidth <= 768;
};


// --- Gallery Configuration for Desktop ---
const DESKTOP_GALLERY_CONFIG = {
  FALLOFF_RADIUS: 8.0,
  SCALE_CURVE: 7,
  MAX_SCALE: 3.0,
  MIN_SCALE: 0.95,
  GRID_DENSITY: 0.9,
  Z_LIFT: 2.0,
  DISTORTION_POWER: 0.8,
  DAMPING: 0.33,
};

// --- Gallery Configuration for Mobile ---
const MOBILE_GALLERY_CONFIG = {
  FALLOFF_RADIUS: 6.0,
  SCALE_CURVE: 15,
  MAX_SCALE: 7.0,
  MIN_SCALE: 0.95,
  GRID_DENSITY: 0.9,
  Z_LIFT: 2.0,
  DISTORTION_POWER: 0.8,
  DAMPING: 0.33,
};


// --- Export the appropriate config based on the device ---
export const GALLERY_CONFIG = isMobile() ? MOBILE_GALLERY_CONFIG : DESKTOP_GALLERY_CONFIG;