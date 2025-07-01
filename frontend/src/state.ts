import type { AppState, LogMessage } from './types';

const initialState: AppState = {
  view: 'gallery',
  comparisonMode: 'side-by-side',
  sourceImageForTransform: null,
  isProcessing: false,
  logMessages: [],
  jobId: null,
  generationDetails: null,
  isCommunityItem: false,
  showTutorial: false,
};
export const state: AppState = initialState;

// --- Helper Functions ---
const formatTime = (): string => new Date().toLocaleTimeString('en-GB');

const listeners: Set<() => void> = new Set();

export const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const setState = <K extends keyof AppState>(key: K, value: AppState[K]): void => {
  state[key] = value;
  listeners.forEach((listener) => listener());
};

export const addLogMessage = (text: string, type: LogMessage['type'] = 'info'): void => {
    const newLog: LogMessage = { time: formatTime(), text, type };
    setState('logMessages', [...state.logMessages, newLog]);
};

