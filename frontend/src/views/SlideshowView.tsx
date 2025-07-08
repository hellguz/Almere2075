import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config';
import type { GenerationDetails } from '../types';
import './SlideshowView.css';

/**
 * Fetches a random generation from the backend.
 * @param {string} dataset The dataset to fetch from ('weimar' or 'almere').
 * @returns {Promise<GenerationDetails>} A promise that resolves to the generation details.
 */
const fetchRandomGeneration = async (dataset: string): Promise<GenerationDetails> => {
    console.log(`Fetching new image for '${dataset}' dataset...`);
    const response = await fetch(`${API_BASE_URL}/random-generation?dataset=${dataset}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch. Status:", response.status, "Error:", errorText);
        throw new Error(`Failed to fetch random generation for ${dataset}`);
    }
    const data = await response.json();
    console.log("Successfully fetched new image ID:", data.id);
    return data;
};

/**
 * Preloads an image to cache it in the browser.
 * @param {string} src The source URL of the image to preload.
 * @returns {Promise<void>} A promise that resolves when the image is loaded.
 */
const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });
};

/**
 * A non-interactive slideshow view for projecting generated images.
 * @returns {JSX.Element} The rendered SlideshowView component.
 */
const SlideshowView: React.FC = () => {
    const [currentGen, setCurrentGen] = useState<GenerationDetails | null>(null);
    const [nextGen, setNextGen] = useState<GenerationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [animationKey, setAnimationKey] = useState(0);
    const [iterationCount, setIterationCount] = useState(0);

    const sliderRef = useRef<HTMLDivElement>(null);
    
    const dataset = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('set') || 'almere';
    }, []);

    const capitalizedDataset = useMemo(() => dataset.charAt(0).toUpperCase() + dataset.slice(1), [dataset]);

    const getImageUrl = useCallback((gen: GenerationDetails | null, type: 'original' | 'generated'): string => {
        if (!gen) return '';
        if (type === 'original') {
            return `${API_BASE_URL}/images/${gen.dataset}/${gen.original_image_filename}`;
        }
        return gen.generated_image_url ? `${API_BASE_URL}/${gen.generated_image_url}` : '';
    }, []);

    // MODIFIED: Combined and improved effect for handling all animation events.
    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        console.log(`[Cycle ${animationKey}] Attaching listeners. Current image: ${currentGen?.id}, Next image: ${nextGen?.id}`);

        const handleAnimationIteration = () => {
            setIterationCount(c => {
                const newCount = c + 1;
                console.log(`[Cycle ${animationKey}] Pass ${newCount} complete.`);
                return newCount;
            });
        };

        const handleAnimationEnd = () => {
            console.log(`[Cycle ${animationKey}] All 4 passes finished. Swapping to next image and restarting cycle.`);
            if (nextGen) {
                setCurrentGen(nextGen);
                // Fetch the *next* generation ahead of time
                fetchRandomGeneration(dataset)
                    .then(setNextGen)
                    .catch(err => {
                        console.error("COULD NOT FETCH NEXT IMAGE. Slideshow will pause after next cycle.", err);
                        // Attempt to recover after a delay
                        setTimeout(() => {
                           fetchRandomGeneration(dataset).then(setNextGen).catch(() => {});
                        }, 5000);
                    });
            } else {
                console.error("`nextGen` was null, cannot proceed. Restarting with current image.");
            }
            // Reset state for the new cycle and trigger a re-mount of the animation container
            setIterationCount(0);
            setAnimationKey(k => k + 1);
        };

        slider.addEventListener('animationiteration', handleAnimationIteration);
        slider.addEventListener('animationend', handleAnimationEnd);

        return () => {
            console.log(`[Cycle ${animationKey}] Cleaning up listeners.`);
            slider.removeEventListener('animationiteration', handleAnimationIteration);
            slider.removeEventListener('animationend', handleAnimationEnd);
        };
    }, [animationKey, dataset, nextGen, currentGen]);

    // Preloading effect
    useEffect(() => {
        if (nextGen) {
            console.log(`Preloading images for next item: ${nextGen.id}`);
            preloadImage(getImageUrl(nextGen, 'original')).catch(console.error);
            preloadImage(getImageUrl(nextGen, 'generated')).catch(console.error);
        }
    }, [nextGen, getImageUrl]);

    // Initial data load effect
    useEffect(() => {
        const init = async () => {
            try {
                console.log("Initializing slideshow...");
                const [initialGen, secondGen] = await Promise.all([
                    fetchRandomGeneration(dataset),
                    fetchRandomGeneration(dataset),
                ]);
                
                await Promise.all([
                    preloadImage(getImageUrl(initialGen, 'original')),
                    preloadImage(getImageUrl(initialGen, 'generated')),
                    preloadImage(getImageUrl(secondGen, 'original')),
                    preloadImage(getImageUrl(secondGen, 'generated')),
                ]);

                setCurrentGen(initialGen);
                setNextGen(secondGen);
                setIsLoading(false);
                console.log("Initialization complete. Starting animation.");
            } catch (error) {
                console.error("FATAL: Could not initialize slideshow.", error);
                setIsLoading(false); // Stop loading screen to show error
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataset]);

    if (isLoading) {
        return <div className="slideshow-view"><div className="slideshow-loading">Loading Slideshow...</div></div>;
    }

    if (!currentGen) {
        return <div className="slideshow-view"><div className="slideshow-loading">Error: Could not load any images. Please check the connection and refresh.</div></div>;
    }

    const currentOriginalUrl = getImageUrl(currentGen, 'original');
    const currentGeneratedUrl = getImageUrl(currentGen, 'generated');
    const nextOriginalUrl = getImageUrl(nextGen, 'original');

    // On the 4th pass (iteration 3), the base image should be the *next* original.
    const baseImageUrl = iterationCount === 3 ? nextOriginalUrl : currentOriginalUrl;

    return (
        <div className="slideshow-view">
            <div key={animationKey} className="slideshow-content is-animating">
                {/* Image Layers */}
                <div className="slideshow-image visible" style={{ backgroundImage: `url("${baseImageUrl}")` }} />
                <div className="slideshow-image after visible" style={{ backgroundImage: `url("${currentGeneratedUrl}")` }} />
                
                {/* Text Layers */}
                <div className="slideshow-text-overlay">
                    <div className="slideshow-text before">{capitalizedDataset} 2025</div>
                    <div className="slideshow-text after">{capitalizedDataset} 2075</div>
                </div>

                {/* The slider which drives the events */}
                <div ref={sliderRef} className="slideshow-slider" />
            </div>

            {/* Static Tags Overlay */}
            <div className="slideshow-tags-overlay">
                {currentGen?.tags_used?.map(tag => (
                    <div key={tag} className="slideshow-tag-chip">{tag}</div>
                ))}
            </div>
        </div>
    );
};

export default SlideshowView;