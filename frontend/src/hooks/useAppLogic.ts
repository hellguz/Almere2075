import { useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, POLLING_INTERVAL } from '../config';
import { useStore } from '../store';
import type { GalleryImage, Tag, GenerationDetails, SourceImage } from '../types';
import { Texture } from 'three';

// This hook encapsulates the application's side-effects (API calls, timers)
// and provides a clean API of "handlers" for components to call.
export const useAppLogic = () => {
    const pollingRef = useRef<number | null>(null);

    // Get actions from the store once. They are stable and don't cause re-renders.
    const {
        addLogMessage,
        setState,
        setGalleryImages,
        setAvailableTags,
        resetForNewTransform,
        startTransform,
        openTutorial, // MODIFIED: Renamed from showTutorial
        closeTutorial,
        setCommunityGalleryItems,
        optimisticallyUpdateVote,
        openModal,
        closeModal,
        toggleTag,
    } = useStore.getState();

    // Effect for fetching initial app data (source images, tags)
    useEffect(() => {
        const hasSeen = localStorage.getItem('almere2075-tutorial-seen');
        if (!hasSeen) {
            openTutorial(); // MODIFIED: Use the new action name
        }

        const fetchInitialData = async () => {
            try {
                const [galleryRes, tagsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/gallery`),
                    fetch(`${API_BASE_URL}/tags`),
                ]);
                if (!galleryRes.ok || !tagsRes.ok) throw new Error(`Initial data fetch failed`);
                
                const images: GalleryImage[] = await galleryRes.json();
                setGalleryImages(images.filter(img => img.thumbnail));

                const tags: Tag[] = await tagsRes.json();
                setAvailableTags(tags);
            } catch (e) {
                console.error(`Error fetching initial data: ${(e as Error).message}`);
            }
        };
        fetchInitialData();
        
        // Cleanup polling on unmount
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [setGalleryImages, setAvailableTags, openTutorial]); // MODIFIED: Updated dependency array

    const pollJobStatus = useCallback((jobId: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = window.setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/job-status/${jobId}`);
            if (!res.ok) return; 
            const data = await res.json();
    
            if (data.status === 'completed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              addLogMessage('--- Transformation Complete ---', 'success');
              setState('generationDetails', data.generation_data as GenerationDetails);
              setState('isProcessing', false);
              setState('view', 'comparison');
            } else if (data.status === 'failed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              throw new Error(data.error || 'Job failed for an unknown reason.');
            }
          } catch (err) {
            addLogMessage(`Polling failed: ${(err as Error).message}`, 'error');
            setState('isProcessing', false);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }, POLLING_INTERVAL);
    }, [addLogMessage, setState]);

    const handleTransform = useCallback(async () => {
        const { sourceImageForTransform, selectedTags } = useStore.getState();
        if (!sourceImageForTransform) return;
        
        setState('isProcessing', true);
        setState('logMessages', [{time: new Date().toLocaleTimeString('en-GB'), text: '--- Initiating Transformation Protocol ---', type: 'system'}]);
        
        try {
            addLogMessage('Step 1/3: Generating vision prompt...');
            const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ imageBase64: sourceImageForTransform.url, tags: selectedTags }) 
            });
            if (!promptResponse.ok) throw new Error(`AI Vision Connection failed: ${promptResponse.statusText}`);
            const promptData = await promptResponse.json();
            addLogMessage('Vision prompt generated.');
            addLogMessage(`Prompt: ${promptData.prompt}`);
    
            addLogMessage('Step 2/3: Submitting to FLUX renderer...');
            const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    imageBase64: sourceImageForTransform.url, 
                    prompt: promptData.prompt,
                    tags: promptData.tags_used,
                    original_filename: sourceImageForTransform.name
                }) 
            });
            if (!transformResponse.ok) throw new Error(`FLUX renderer submission failed: ${transformResponse.statusText}`);
            const { job_id } = await transformResponse.json();
            setState('jobId', job_id);
            addLogMessage(`Job submitted with ID: ${job_id}.`);
            
            addLogMessage('Step 3/3: Awaiting result...');
            pollJobStatus(job_id);
        } catch (err) {
            addLogMessage(`PROCESS FAILED: ${(err as Error).message}`, 'error');
            setState('isProcessing', false);
        }
    }, [pollJobStatus, addLogMessage, setState]);

    const handleBackToStart = useCallback(() => {
        resetForNewTransform();
        setState('view', 'gallery');
    }, [resetForNewTransform, setState]);

    const handleSelectGalleryImage = useCallback((texture: Texture) => {
        const { galleryImages } = useStore.getState();
        const thumbnailSrc = texture.image.src;
        const thumbnailFilename = thumbnailSrc.split('/').pop();
        const fullImage = galleryImages.find(img => img.thumbnail === thumbnailFilename);
        if (fullImage) {
            const source: SourceImage = {
                url: `${API_BASE_URL}/images/${fullImage.filename}`,
                name: fullImage.filename
            };
            startTransform(source);
        } else {
            console.error("Could not find matching full-size image for thumbnail:", thumbnailFilename);
        }
    }, [startTransform]);

    const handleSetName = useCallback(async (name: string) => {
        const { jobId, generationDetails } = useStore.getState();
        const currentJobId = jobId || generationDetails?.id;
        if (!currentJobId) return;
        try {
            await fetch(`${API_BASE_URL}/generations/${currentJobId}/set-name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (generationDetails) {
                setState('generationDetails', { ...generationDetails, creator_name: name });
            }
        } catch (error) {
           console.error("Failed to set name:", error);
        }
    }, [setState]);

    const handleHide = useCallback(async () => {
        const { jobId, generationDetails } = useStore.getState();
        const currentJobId = jobId || generationDetails?.id;
        if (!currentJobId) return;
        if (window.confirm("Are you sure you want to permanently remove this image from the gallery? This cannot be undone.")) {
            try {
                await fetch(`${API_BASE_URL}/generations/${currentJobId}/hide`, { method: 'POST' });
                alert("This image has been removed from the public gallery.");
                handleBackToStart();
            } catch (error) {
                console.error("Failed to hide generation:", error);
                alert("Failed to hide generation. See console for details.");
            }
        }
    }, [handleBackToStart]);
    
    const fetchCommunityGallery = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/public-gallery`);
            if (!response.ok) throw new Error('Failed to fetch gallery');
            const data: GenerationDetails[] = await response.json();
            setCommunityGalleryItems(data);
        } catch (error) {
             console.error("Error fetching community gallery:", error);
        }
    }, [setCommunityGalleryItems]);

    const handleVote = useCallback(async (generationId: string) => {
        optimisticallyUpdateVote(generationId); // Update UI immediately
        try {
            const res = await fetch(`${API_BASE_URL}/generations/${generationId}/vote`, { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Vote failed");
            }
        } catch (error) {
            alert(`Vote failed: ${(error as Error).message}. Reverting.`);
            fetchCommunityGallery(); // Re-fetch to revert to correct state
        }
    }, [optimisticallyUpdateVote, fetchCommunityGallery]);

    // Expose a collection of stable handlers for components to use.
    return {
        handlers: {
            handleBackToStart,
            handleTransform,
            handleSelectGalleryImage,
            handleStartTransform: startTransform,
            handleSetName,
            handleHide,
            handleVote,
            handleModalOpen: openModal,
            handleModalClose: closeModal,
            handleTagToggle: toggleTag,
            handleCloseTutorial: closeTutorial,
            handleShowTutorial: openTutorial, // MODIFIED: Point to the renamed action
            fetchCommunityGallery,
            setState,
        }
    };
};