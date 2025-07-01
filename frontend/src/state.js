// --- Global State ---
const AppState = {
  view: 'gallery', // gallery, transform, comparison, community_gallery
  comparisonMode: 'side-by-side', // Set side-by-side as default
  sourceImageForTransform: null, // Holds {url, name} for the image being processed
  isProcessing: false,
  logMessages: [],
  jobId: null,
  generationDetails: null, // Full data of the completed generation from the backend
  isCommunityItem: false, // Flag to know if the background should be blurred
  showTutorial: false, // ADDED: Controls the visibility of the tutorial modal
};
export const state = AppState;

// --- Helper Functions ---
const formatTime = () => new Date().toLocaleTimeString('en-GB');
const listeners = new Set();
export const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
export const setState = (key, value) => {
  state[key] = value;
  listeners.forEach((listener) => listener());
};
export const addLogMessage = (text, type = 'info') => {
    const newLog = { time: formatTime(), text, type };
    setState('logMessages', [...state.logMessages, newLog]);
};



