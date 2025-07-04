import { create, StoreApi } from 'zustand';
import type { LogMessage, SourceImage, GenerationDetails, GalleryImage, Tag } from './types';
import React from 'react';
import { Texture } from 'three';
import { API_BASE_URL, POLLING_INTERVAL } from './config';

// Define the shape of the store's state
export interface StoreState {
    view: 'gallery' | 'transform' | 'comparison' | 'community_gallery';
    dataset: 'weimar' | 'almere';
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
    pollingRef: React.MutableRefObject<number | null>;
}

// Define the shape of the actions
export interface StoreActions {
    setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
    setDataset: (dataset: 'weimar' | 'almere') => void;
    addLogMessage: (text: string, type?: LogMessage['type']) => void;
    resetForNewTransform: () => void;
    startTransform: (sourceImage: SourceImage) => void;
    toggleTag: (tagId: string) => void;
    openModal: (item: GenerationDetails) => void;
    closeModal: () => void;
    openTutorial: () => void;
    closeTutorial: () => void;
    fetchInitialData: () => Promise<void>;
    fetchGalleryImages: () => Promise<void>;
    fetchCommunityGallery: () => Promise<void>;
    pollJobStatus: (jobId: string) => void;
    handleTransform: () => Promise<void>;
    handleSelectGalleryImage: (texture: Texture) => void;
    handleSetName: (name: string) => Promise<void>;
    handleHide: () => Promise<void>;
    handleVote: (generationId: string) => Promise<void>;
    handleBackToStart: () => void;
    handleShowTutorial: () => void;
    optimisticallyUpdateVote: (generationId: string) => void;
}

const formatTime = (): string => new Date().toLocaleTimeString('en-GB');
const isMobile = window.innerWidth <= 768;

type FullStore = StoreState & { actions: StoreActions };
type StoreCreator = (set: StoreApi<FullStore>['setState'], get: StoreApi<FullStore>['getState']) => FullStore;

// The creator function now defines actions in a way they can call each other
const storeCreator: StoreCreator = (set, get) => {
    const actions: StoreActions = {
        setState: (key, value) => set({ [key]: value }),
        setDataset: (dataset) => set({ dataset, galleryImages: [], communityGalleryItems: [] }),
        
        addLogMessage: (text, type = 'info') => {
            const newLog: LogMessage = { time: formatTime(), text, type };
            set(state => ({ logMessages: [...state.logMessages, newLog] }));
        },
        resetForNewTransform: () => set({
            sourceImageForTransform: null, isProcessing: false, logMessages: [],
            jobId: null, generationDetails: null, isCommunityItem: false, selectedTags: [],
        }),
        startTransform: (sourceImage) => {
            actions.resetForNewTransform();
            set({ sourceImageForTransform: sourceImage, view: 'transform' });
            actions.addLogMessage(`Source selected: ${sourceImage.name}`);
        },
        toggleTag: (tagId) => set(state => ({
            selectedTags: state.selectedTags.includes(tagId)
                ? state.selectedTags.filter(t => t !== tagId)
                : [...state.selectedTags, tagId]
        })),

        openModal: (item) => set({ isCommunityItem: true, modalItem: item }),
        closeModal: () => set({ isCommunityItem: false, modalItem: null }),
        openTutorial: () => set({ showTutorial: true }),
        closeTutorial: () => {
            localStorage.setItem('almere2075-tutorial-seen', 'true');
            set({ showTutorial: false });
        },
        handleBackToStart: () => {
            actions.resetForNewTransform();
            set({ view: 'gallery' });
        },
        handleShowTutorial: () => actions.openTutorial(),

        fetchInitialData: async () => {
            if (!localStorage.getItem('almere2075-tutorial-seen')) {
                actions.openTutorial();
            }
            try {
                const tagsRes = await fetch(`${API_BASE_URL}/tags`);
                if (!tagsRes.ok) throw new Error(`Tags data fetch failed`);
                set({ availableTags: await tagsRes.json() });
            } catch (e) {
                console.error(`Error fetching tags: ${(e as Error).message}`);
            }
        },
        fetchGalleryImages: async () => {
            try {
                const galleryRes = await fetch(`${API_BASE_URL}/gallery?dataset=${get().dataset}`);
                if (!galleryRes.ok) throw new Error(`Gallery data fetch failed for dataset: ${get().dataset}`);
                const images: GalleryImage[] = await galleryRes.json();
                set({ galleryImages: images.filter(img => img.thumbnail) });
            } catch (e) {
                console.error(`Error fetching gallery data: ${(e as Error).message}`);
            }
        },
        fetchCommunityGallery: async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/public-gallery?dataset=${get().dataset}`);
                if (!response.ok) throw new Error('Failed to fetch gallery');
                const items = await response.json();
                set({ communityGalleryItems: items.sort((a: GenerationDetails, b: GenerationDetails) => b.votes - a.votes) });
            } catch (error) {
                console.error("Error fetching community gallery:", error);
            }
        },
        pollJobStatus: (jobId) => {
            const currentPollingRef = get().pollingRef;
            if (currentPollingRef.current) clearInterval(currentPollingRef.current);
            currentPollingRef.current = window.setInterval(async () => {
              try {
                const res = await fetch(`${API_BASE_URL}/job-status/${jobId}`);
                if (!res.ok) return; 
                const data = await res.json();
                if (data.status === 'completed') {
                  if (currentPollingRef.current) clearInterval(currentPollingRef.current);
                  actions.addLogMessage('--- Transformation Complete ---', 'success');
                  set({ generationDetails: data.generation_data, isProcessing: false, view: 'comparison' });
                } else if (data.status === 'failed') {
                  if (currentPollingRef.current) clearInterval(currentPollingRef.current);
                  throw new Error(data.error || 'Job failed for an unknown reason.');
                }
              } catch (err) {
                actions.addLogMessage(`Polling failed: ${(err as Error).message}`, 'error');
                set({ isProcessing: false });
                if (currentPollingRef.current) clearInterval(currentPollingRef.current);
              }
            }, POLLING_INTERVAL);
        },
        handleTransform: async () => {
            const { sourceImageForTransform, selectedTags, dataset } = get();
            if (!sourceImageForTransform) return;
            
            set({ isProcessing: true, logMessages: [{time: formatTime(), text: '--- Initiating Transformation Protocol ---', type: 'system'}]});
            
            try {
                actions.addLogMessage('Step 1/3: Generating vision prompt...');
                const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: sourceImageForTransform.url, tags: selectedTags }) 
                });
                if (!promptResponse.ok) throw new Error(`AI Vision Connection failed: ${promptResponse.statusText}`);
                const promptData = await promptResponse.json();
                actions.addLogMessage('Vision prompt generated.');
                actions.addLogMessage(`Prompt: ${promptData.prompt}`);
        
                actions.addLogMessage('Step 2/3: Submitting to FLUX renderer...');
                const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                        imageBase64: sourceImageForTransform.url, 
                        prompt: promptData.prompt,
                        tags: promptData.tags_used,
                        original_filename: sourceImageForTransform.name,
                        dataset: dataset
                    }) 
                });
                if (!transformResponse.ok) throw new Error(`FLUX renderer submission failed: ${transformResponse.statusText}`);
                const { job_id } = await transformResponse.json();
                set({ jobId: job_id });
                actions.addLogMessage(`Job submitted with ID: ${job_id}.`);
                
                actions.addLogMessage('Step 3/3: Awaiting result...');
                actions.pollJobStatus(job_id);
            } catch (err) {
                actions.addLogMessage(`PROCESS FAILED: ${(err as Error).message}`, 'error');
                set({ isProcessing: false });
            }
        },
        handleSelectGalleryImage: (texture: Texture) => {
            const { galleryImages, dataset } = get();
            const thumbnailSrc = texture.image.src;
            const fullImage = galleryImages.find(img => thumbnailSrc.endsWith(img.thumbnail));
            if (fullImage) {
                const source: SourceImage = {
                    url: `${API_BASE_URL}/images/${fullImage.filename}`,
                    name: fullImage.filename.split('/').pop() || ''
                };
                actions.startTransform(source);
            } else {
                console.error("Could not find matching full-size image for thumbnail:", thumbnailSrc);
            }
        },
        handleSetName: async (name: string) => {
            const { jobId, generationDetails } = get();
            const currentJobId = jobId || generationDetails?.id;
            if (!currentJobId) return;
            try {
                await fetch(`${API_BASE_URL}/generations/${currentJobId}/set-name`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
                });
                if (get().generationDetails) {
                    set({ generationDetails: { ...get().generationDetails!, creator_name: name } });
                }
            } catch (error) {
                console.error("Failed to set name:", error);
            }
        },
        handleHide: async () => {
            const { jobId, generationDetails } = get();
            const currentJobId = jobId || generationDetails?.id;
            if (!currentJobId) return;
            if (window.confirm("Are you sure you want to permanently remove this image? This cannot be undone.")) {
                try {
                    await fetch(`${API_BASE_URL}/generations/${currentJobId}/hide`, { method: 'POST' });
                    alert("This image has been removed from the public gallery.");
                    actions.handleBackToStart();
                } catch (error) {
                    console.error("Failed to hide generation:", error);
                    alert("Failed to hide generation. See console for details.");
                }
            }
        },
        handleVote: async (generationId: string) => {
            actions.optimisticallyUpdateVote(generationId);
            try {
                const res = await fetch(`${API_BASE_URL}/generations/${generationId}/vote`, { method: 'POST' });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.detail || "Vote failed");
                }
            } catch (error) {
                alert(`Vote failed: ${(error as Error).message}. Reverting.`);
                actions.fetchCommunityGallery();
            }
        },
        optimisticallyUpdateVote: (generationId: string) => {
            set(state => ({
                communityGalleryItems: state.communityGalleryItems.map(item => 
                    item.id === generationId ? { ...item, votes: item.votes + 1 } : item
                ).sort((a, b) => b.votes - a.votes),
                modalItem: state.modalItem && state.modalItem.id === generationId 
                    ? { ...state.modalItem, votes: state.modalItem.votes + 1 } 
                    : state.modalItem,
            }));
        },
    };
    
    return {
        view: 'gallery',
        dataset: 'weimar',
        comparisonMode: isMobile ? 'slider' : 'side-by-side',
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
        pollingRef: React.createRef(),
        actions,
    };
};

export const useStore = create<FullStore>(storeCreator);