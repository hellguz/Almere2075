import { create } from 'zustand';
import type { LogMessage, SourceImage, GenerationDetails, GalleryImage, Tag } from './types';

// Define the shape of the store's state
export interface StoreState {
    view: 'gallery' | 'transform' | 'comparison' | 'community_gallery';
    comparisonMode: 'slider' | 'side-by-side';
    sourceImageForTransform: SourceImage | null;
    isProcessing: boolean;
    logMessages: LogMessage[];
    jobId: string | null;
    generationDetails: GenerationDetails | null;
    isCommunityItem: boolean;
    showTutorial: boolean;
    galleryImages: GalleryImage[];
    communityGalleryItems: GenerationDetails[];
    availableTags: Tag[];
    selectedTags: string[];
    modalItem: GenerationDetails | null;
}

// Define the shape of the actions
export interface StoreActions {
    setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
    addLogMessage: (text: string, type?: LogMessage['type']) => void;
    resetForNewTransform: () => void;
    startTransform: (sourceImage: SourceImage) => void;
    toggleTag: (tagId: string) => void;
    openModal: (item: GenerationDetails) => void;
    closeModal: () => void;
    openTutorial: () => void; // MODIFIED: Renamed from showTutorial
    closeTutorial: () => void;
    setGalleryImages: (images: GalleryImage[]) => void;
    setCommunityGalleryItems: (items: GenerationDetails[]) => void;
    setAvailableTags: (tags: Tag[]) => void;
    optimisticallyUpdateVote: (generationId: string) => void;
}

const formatTime = (): string => new Date().toLocaleTimeString('en-GB');

// Create the store
export const useStore = create<StoreState & StoreActions>((set, get) => ({
    // Initial State
    view: 'gallery',
    comparisonMode: 'side-by-side',
    sourceImageForTransform: null,
    isProcessing: false,
    logMessages: [],
    jobId: null,
    generationDetails: null,
    isCommunityItem: false,
    showTutorial: false,
    galleryImages: [],
    communityGalleryItems: [],
    availableTags: [],
    selectedTags: [],
    modalItem: null,

    // Actions
    setState: (key, value) => set({ [key]: value }),
    
    addLogMessage: (text, type = 'info') => {
        const newLog: LogMessage = { time: formatTime(), text, type };
        set(state => ({ logMessages: [...state.logMessages, newLog] }));
    },
    
    resetForNewTransform: () => set({
        sourceImageForTransform: null,
        isProcessing: false,
        logMessages: [],
        jobId: null,
        generationDetails: null,
        isCommunityItem: false,
        selectedTags: [],
    }),
    
    startTransform: (sourceImage) => {
        get().resetForNewTransform();
        set({ sourceImageForTransform: sourceImage, view: 'transform' });
        get().addLogMessage(`Source selected: ${sourceImage.name}`);
    },

    toggleTag: (tagId) => set(state => ({
        selectedTags: state.selectedTags.includes(tagId)
            ? state.selectedTags.filter(t => t !== tagId)
            : [...state.selectedTags, tagId]
    })),

    openModal: (item) => set({ isCommunityItem: true, modalItem: item }),
    closeModal: () => set({ isCommunityItem: false, modalItem: null }),

    openTutorial: () => set({ showTutorial: true }), // MODIFIED: Renamed from showTutorial

    closeTutorial: () => {
        localStorage.setItem('almere2075-tutorial-seen', 'true');
        set({ showTutorial: false });
    },
    
    setGalleryImages: (images) => set({ galleryImages: images }),
    setCommunityGalleryItems: (items) => set({ communityGalleryItems: items.sort((a, b) => b.votes - a.votes) }),
    setAvailableTags: (tags) => set({ availableTags: tags }),
    
    optimisticallyUpdateVote: (generationId: string) => {
        set(state => ({
            communityGalleryItems: state.communityGalleryItems.map(item => 
                item.id === generationId ? { ...item, votes: item.votes + 1 } : item
            ).sort((a, b) => b.votes - a.votes),
            modalItem: state.modalItem && state.modalItem.id === generationId 
                ? { ...state.modalItem, votes: state.modalItem.votes + 1 } 
                : state.modalItem,
        }));
    }
}));

