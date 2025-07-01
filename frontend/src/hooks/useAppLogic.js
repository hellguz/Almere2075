import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, POLLING_INTERVAL } from '../config';
import { state, setState, addLogMessage, subscribe } from '../state';

export const useAppLogic = () => {
    const [appState, setAppState] = useState(state);
    const [galleryImages, setGalleryImages] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [modalItem, setModalItem] = useState(null);
    const pollingRef = useRef(null);

    // Subscribe to global state changes
    useEffect(() => subscribe(() => setAppState({ ...state })), []);

    // Fetch initial gallery images and tags
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [galleryRes, tagsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/gallery`),
                    fetch(`${API_BASE_URL}/tags`),
                ]);
                if (!galleryRes.ok) throw new Error(`Gallery fetch failed: ${galleryRes.statusText}`);
                if (!tagsRes.ok) throw new Error(`Tags fetch failed: ${tagsRes.statusText}`);
                
                const images = await galleryRes.json();
                setGalleryImages(images.filter(img => img.thumbnail));

                const tags = await tagsRes.json();
                setAvailableTags(tags);
            } catch (e) {
                console.error(`Error fetching initial data: ${e.message}`);
            }
        };
        fetchInitialData();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const pollJobStatus = useCallback((jobId) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/job-status/${jobId}`);
            if (!res.ok) return; 
            const data = await res.json();
    
            if (data.status === 'completed') {
              clearInterval(pollingRef.current);
              addLogMessage('--- Transformation Complete ---', 'success');
              setState('generationDetails', data.generation_data);
              setState('isProcessing', false);
              setState('view', 'comparison');
            } else if (data.status === 'failed') {
              clearInterval(pollingRef.current);
              throw new Error(data.error || 'Job failed for an unknown reason.');
            }
          } catch (err) {
            addLogMessage(`Polling failed: ${err.message}`, 'error');
            setState('isProcessing', false);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }, POLLING_INTERVAL);
    }, []);

    const handleTransform = useCallback(async () => {
        if (!state.sourceImageForTransform) return;
        
        setState('isProcessing', true);
        setState('view', 'transform');
        setState('logMessages', [{time: new Date().toLocaleTimeString('en-GB'), text: '--- Initiating Transformation Protocol ---', type: 'system'}]);
        
        try {
            addLogMessage('Step 1/3: Generating vision prompt...');
            const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ imageBase64: state.sourceImageForTransform.url, tags: selectedTags }) 
            });
            if (!promptResponse.ok) throw new Error(`AI Vision Conection failed: ${promptResponse.statusText}`);
            const promptData = await promptResponse.json();
            addLogMessage('Vision prompt generated.', 'success');
    
            addLogMessage('Step 2/3: Submitting to FLUX renderer...');
            const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    imageBase64: state.sourceImageForTransform.url, 
                    prompt: promptData.prompt,
                    tags: promptData.tags_used,
                    original_filename: state.sourceImageForTransform.name
                }) 
            });
            if (!transformResponse.ok) throw new Error(`FLUX renderer submission failed: ${transformResponse.statusText}`);
            const { job_id } = await transformResponse.json();
            setState('jobId', job_id);
            addLogMessage(`Job submitted with ID: ${job_id}.`, 'system');
            
            addLogMessage('Step 3/3: Awaiting result...');
            pollJobStatus(job_id);
        } catch (err) {
            addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
            setState('isProcessing', false);
        }
    }, [pollJobStatus, selectedTags]);

    const resetState = () => {
        setState('sourceImageForTransform', null);
        setState('isProcessing', false);
        setState('logMessages', []);
        setState('jobId', null);
        setState('generationDetails', null);
        setState('isCommunityItem', false);
        setSelectedTags([]);
        if (pollingRef.current) clearInterval(pollingRef.current);
    };

    const handleBackToStart = () => {
        resetState();
        setState('view', 'gallery');
    };

    const handleStartTransform = (sourceImage) => {
        resetState();
        setState('sourceImageForTransform', sourceImage);
        setState('view', 'transform');
        addLogMessage(`Source selected: ${sourceImage.name}`);
    };

    const handleSelectGalleryImage = (texture) => {
        const thumbnailSrc = texture.image.src;
        const thumbnailFilename = thumbnailSrc.split('/').pop();
        const fullImage = galleryImages.find(img => img.thumbnail === thumbnailFilename);
        
        if (fullImage) {
            const source = {
                url: `${API_BASE_URL}/images/${fullImage.filename}`,
                name: fullImage.filename
            };
            handleStartTransform(source);
        } else {
            console.error("Could not find matching full-size image for thumbnail:", thumbnailFilename);
            alert("An error occurred while selecting the image. Please try another one.");
        }
    };

    const handleSetName = useCallback(async (name) => {
        const jobId = appState.jobId || appState.generationDetails?.id;
        if (!jobId) return;
        try {
            await fetch(`${API_BASE_URL}/generations/${jobId}/set-name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (appState.generationDetails) {
                setState('generationDetails', { ...appState.generationDetails, creator_name: name });
            }
        } catch (error) {
           console.error("Failed to set name:", error);
        }
    }, [appState.jobId, appState.generationDetails]);

    const handleHide = useCallback(async () => {
        const jobId = appState.jobId || appState.generationDetails?.id;
        if (!jobId) return;
        if (window.confirm("Are you sure you want to permanently remove this image from the gallery? This cannot be undone.")) {
            try {
                await fetch(`${API_BASE_URL}/generations/${jobId}/hide`, { method: 'POST' });
                alert("This image has been removed from the public gallery.");
                handleBackToStart();
            } catch (error) {
                console.error("Failed to hide generation:", error);
                alert("Failed to hide generation. See console for details.");
            }
        }
    }, [appState.jobId, appState.generationDetails]);

    const handleVote = useCallback(async (generationId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/generations/${generationId}/vote`, { method: 'POST' });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Vote failed");
            }
        } catch (error) {
            throw error; // Re-throw to be caught in the component
        }
    }, []);
    
    const handleModalOpen = (item) => {
        setState('isCommunityItem', true);
        setModalItem(item);
    };

    const handleModalClose = () => {
        setState('isCommunityItem', false);
        setModalItem(null);
    };

    const handleTagToggle = (tagId) => {
        setSelectedTags(current => 
            current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId]
        );
    };

    return {
        appState,
        galleryImages,
        availableTags,
        selectedTags,
        modalItem,
        handlers: {
            handleBackToStart,
            handleTransform,
            handleSelectGalleryImage,
            handleStartTransform,
            handleSetName,
            handleHide,
            handleVote,
            handleModalOpen,
            handleModalClose,
            handleTagToggle,
            setState, // Expose setState directly for simple changes like comparisonMode
        }
    };
};

