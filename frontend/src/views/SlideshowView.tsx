import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config';
import type { GenerationDetails } from '../types';
import NewsTicker from '../components/ui/NewsTicker';
import { tickerConfig } from '../tickerConfig';
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
    const [isAnimating, setIsAnimating] = useState(false);
    const [visibleYear, setVisibleYear] = useState('2025');

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
            if (nextGen) {
                setCurrentGen(nextGen);
                fetchRandomGeneration(dataset)
                    .then(setNextGen)
                    .catch(err => {
                        console.error("COULD NOT FETCH NEXT IMAGE. Slideshow will pause after next cycle.", err);
                        setTimeout(() => {
                            fetchRandomGeneration(dataset).then(setNextGen).catch(() => {});
                        }, 5000);
                    });
            }
            setIterationCount(0);
            setIsAnimating(false); // Pause animation briefly for state to update
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
    }, [animationKey]);

    // Effect to handle the year text change based on slider position.
    useEffect(() => {
        let animFrameId: number;
    
        const updateYearBasedOnSlider = () => {
            if (sliderRef.current) {
                // Get the computed 'left' value as a percentage.
                const leftPercent = parseFloat(getComputedStyle(sliderRef.current).left) / window.innerWidth * 100;
    
                const isLTR = iterationCount % 2 === 0; // Animation direction
                let year = '2025';
    
                if (isLTR) { // Moving left to right (0 -> 100), reveal 2075
                    year = leftPercent > 50 ? '2075' : '2025';
                } else { // Moving right to left (100 -> 0), reveal 2025
                    year = leftPercent < 50 ? '2075' : '2025';
                }
                setVisibleYear(year);
            }
            animFrameId = requestAnimationFrame(updateYearBasedOnSlider);
        };
    
        if (isAnimating) {
            animFrameId = requestAnimationFrame(updateYearBasedOnSlider);
        } else {
            // Reset year for the next cycle's start
            setVisibleYear('2025');
        }
    
        return () => {
            cancelAnimationFrame(animFrameId);
        };
    }, [isAnimating, iterationCount]);

    // Preloading effect
    useEffect(() => {
        if (nextGen) {
            preloadImage(getImageUrl(nextGen, 'original')).catch(console.error);
            preloadImage(getImageUrl(nextGen, 'generated')).catch(console.error);
        }
    }, [nextGen, getImageUrl]);

    // Initial data load effect
    useEffect(() => {
        const init = async () => {
            try {
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
            } catch (error) {
                console.error("FATAL: Could not initialize slideshow.", error);
                setIsLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataset]);

    // Effect to start animation once loading is complete
    useEffect(() => {
        if (!isLoading) {
            // Use a timeout to ensure all state is settled before starting the animation
            const timer = setTimeout(() => setIsAnimating(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading, animationKey]);
    
    // MODIFIED: Set CSS variables for ticker offsets, always including the top one
    const viewStyle = {
        '--bottom-offset': tickerConfig.showBottomTicker ? tickerConfig.tickerHeight : '0px',
        '--top-offset': tickerConfig.tickerHeight,
    } as React.CSSProperties;

    if (isLoading) {
        return <div className="slideshow-view" style={viewStyle}><div className="slideshow-loading">Loading Slideshow...</div></div>;
    }

    if (!currentGen) {
        return <div className="slideshow-view" style={viewStyle}><div className="slideshow-loading">Error: Could not load any images. Please check the connection and refresh.</div></div>;
    }

    const isFinalPass = iterationCount === 3;
    const currentOriginalUrl = getImageUrl(currentGen, 'original');
    const currentGeneratedUrl = getImageUrl(currentGen, 'generated');
    const nextOriginalUrl = getImageUrl(nextGen, 'original');
    
    return (
        <div className="slideshow-view" style={viewStyle}>
            {/* MODIFIED: Always show a top, rotated ticker in this view */}
            <NewsTicker position="top" isRotated={true} />
            <div className="slideshow-content-wrapper">
                <div key={animationKey} className={`slideshow-content ${isAnimating ? 'is-animating' : ''}`}>
                    <div className="slideshow-image-base" style={{ opacity: isFinalPass ? 0 : 1 }}>
                        <div className="image-sizer" style={{ backgroundImage: `url("${currentOriginalUrl}")` }}></div>
                    </div>
                    <div className="slideshow-image-base" style={{ opacity: isFinalPass ? 1 : 0 }}>
                        <div className="image-sizer" style={{ backgroundImage: `url("${nextOriginalUrl}")` }}></div>
                    </div>
                    <div className="after-image">
                        <div className="image-sizer" style={{ backgroundImage: `url("${currentGeneratedUrl}")` }}></div>
                    </div>
                    
                    <div ref={sliderRef} className="slideshow-slider" />
                </div>

                <div className="slideshow-text-overlay">
                    {capitalizedDataset} {visibleYear}
                </div>

                <div className="slideshow-tags-overlay">
                    {currentGen?.tags_used?.map(tag => (
                        <div key={tag} className="slideshow-tag-chip">{tag}</div>
                    ))}
                </div>
            </div>
            {/* MODIFIED: Keep bottom ticker conditional, but it will also be uppercase */}
            {tickerConfig.showBottomTicker && <NewsTicker position="bottom" />}
        </div>
    );
};

export default SlideshowView;
