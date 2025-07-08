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

    // Effect to handle the end of the full 4-pass cycle.
    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

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

        slider.addEventListener('animationend', handleAnimationEnd);
        return () => slider.removeEventListener('animationend', handleAnimationEnd);
    }, [animationKey, dataset, nextGen, currentGen]);

    // Effect to handle each individual pass to control the image layers.
    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        const handleAnimationIteration = () => {
            setIterationCount(c => c + 1);
        };
        
        slider.addEventListener('animationiteration', handleAnimationIteration);
        return () => slider.removeEventListener('animationiteration', handleAnimationIteration);
    }, [animationKey]); // Re-attach listener only when the whole animation restarts.


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
                setIsLoading(false);
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

    const isFinalPass = iterationCount === 3;
    const currentOriginalUrl = getImageUrl(currentGen, 'original');
    const currentGeneratedUrl = getImageUrl(currentGen, 'generated');
    const nextOriginalUrl = getImageUrl(nextGen, 'original');

    // FIXED: Cast style objects to React.CSSProperties using 'as' to allow for custom properties
    // and prevent the TypeScript error.
    const currentOriginalStyle = {
        '--bg-image': `url("${currentOriginalUrl}")`,
        opacity: isFinalPass ? 0 : 1,
    } as React.CSSProperties;
    const nextOriginalStyle = {
        '--bg-image': `url("${nextOriginalUrl}")`,
        opacity: isFinalPass ? 1 : 0,
    } as React.CSSProperties;
    const afterImageStyle = {
        '--bg-image': `url("${currentGeneratedUrl}")`,
    } as React.CSSProperties;


    return (
        <div className="slideshow-view">
            <div key={animationKey} className="slideshow-content is-animating">
                {/* Layer 1: The current original image. Visible during passes 1-3, fades out on pass 4. */}
                <div
                    className="slideshow-image-base"
                    style={currentOriginalStyle}
                />

                {/* Layer 2: The NEXT original image. Hidden until it fades in on pass 4. */}
                <div
                    className="slideshow-image-base"
                    style={nextOriginalStyle}
                />

                {/* Layer 3: The 'after' generated image, which is wiped back and forth on top. */}
                <div
                    className="after-image"
                    style={afterImageStyle}
                />
                
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