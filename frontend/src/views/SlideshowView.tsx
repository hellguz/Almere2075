import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config';
import type { GenerationDetails } from '../types';
import NewsTicker from '../components/ui/NewsTicker';
import { tickerConfig } from '../tickerConfig';
import './SlideshowView.css';

const ANIMATION_DURATION = 8; // 8 seconds for one slider pass
const PRELOAD_AHEAD = 3;      // How many full generations to preload in advance

// --- Helper Functions ---

const fetchRandomGeneration = async (dataset: string): Promise<GenerationDetails | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/random-generation?dataset=${dataset}`);
        if (!response.ok) throw new Error(`Failed to fetch random generation for ${dataset}`);
        return response.json();
    } catch (error) {
        console.error("Fetch failed:", error);
        return null; // Return null on failure
    }
};

const getImageUrl = (gen: GenerationDetails | null, type: 'original' | 'threat' | 'generated', dataset: string): string => {
    if (!gen) return '';
    if (type === 'original') return `${API_BASE_URL}/images/${gen.dataset || dataset}/${gen.original_image_filename}`;
    if (type === 'threat') return gen.threat_image_url ? `${API_BASE_URL}/${gen.threat_image_url}` : '';
    return gen.generated_image_url ? `${API_BASE_URL}/${gen.generated_image_url}` : '';
};

const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve) => {
        if (!src) return resolve();
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => { console.error(`Failed to preload image: ${src}`); resolve(); };
    });
};

// --- Main Slideshow View Component ---

const SlideshowView: React.FC = () => {
    const [generations, setGenerations] = useState<GenerationDetails[]>([]);
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [baseImageUrl, setBaseImageUrl] = useState('');
    const [revealImageUrl, setRevealImageUrl] = useState('');

    const dataset = useMemo(() => new URLSearchParams(window.location.search).get('set') || 'almere', []);
    const capitalizedDataset = useMemo(() => dataset.charAt(0).toUpperCase() + dataset.slice(1), [dataset]);

    const handleAnimationIteration = useCallback(() => {
        const newStep = step + 1;

        const currentGenIndex = Math.floor(newStep / 3);
        const nextGenIndex = currentGenIndex + 1;
        
        const currentGen = generations[currentGenIndex];
        const nextGen = generations[nextGenIndex];

        if (!currentGen || !nextGen) {
            console.error("Slideshow out of generations, pausing to refetch.");
            // Attempt to recover by refetching
            fetchRandomGeneration(dataset).then(gen => {
                if(gen) setGenerations(g => [...g, gen]);
            });
            return;
        }

        const isSliderOnRight = newStep % 2 === 1;

        if (isSliderOnRight) {
            // A L-to-R animation just finished. The BASE layer is hidden. Update it for the next pass.
            const nextStageIndex = (newStep + 1) % 3;
            if (nextStageIndex === 2) { // Upcoming R->L pass is Threat -> Solution
                setBaseImageUrl(getImageUrl(currentGen, 'generated', dataset));
            } else { // Upcoming R->L pass is New Original -> New Threat
                setBaseImageUrl(getImageUrl(nextGen, 'threat', dataset));
            }
        } else {
            // A R-to-L animation just finished. The REVEAL layer is hidden. Update it for the next pass.
            const nextStageIndex = (newStep + 1) % 3;
            if (nextStageIndex === 0) { // Upcoming L->R pass is Original -> Threat
                setRevealImageUrl(getImageUrl(currentGen, 'threat', dataset));
            } else { // Upcoming L->R pass is Solution -> New Original
                setRevealImageUrl(getImageUrl(nextGen, 'original', dataset));
            }
        }
        
        // Fetch more generations if the queue is running low
        if (generations.length - nextGenIndex < PRELOAD_AHEAD) {
            fetchRandomGeneration(dataset).then(gen => {
                 if(gen) setGenerations(g => [...g, gen]);
            });
        }
        setStep(newStep);
    }, [step, generations, dataset]);
    
    // Initial data load effect
    useEffect(() => {
        const init = async () => {
            try {
                const initialGens = await Promise.all(
                    [...Array(PRELOAD_AHEAD)].map(() => fetchRandomGeneration(dataset))
                );
                const validGens = initialGens.filter((g): g is GenerationDetails => g !== null);

                if (validGens.length < 2) {
                    throw new Error("Could not fetch enough initial generations.");
                }

                await Promise.all(validGens.map(g => Promise.all([
                    preloadImage(getImageUrl(g, 'original', dataset)),
                    preloadImage(getImageUrl(g, 'threat', dataset)),
                    preloadImage(getImageUrl(g, 'generated', dataset)),
                ])));
                
                setGenerations(validGens);
                setBaseImageUrl(getImageUrl(validGens[0], 'original', dataset));
                setRevealImageUrl(getImageUrl(validGens[0], 'threat', dataset));
                setIsLoading(false);
            } catch (error) {
                console.error("FATAL: Could not initialize slideshow.", error);
                setIsLoading(false);
            }
        };
        init();
    }, [dataset]);

    const { textOverlay, tags } = useMemo(() => {
        const genIndex = Math.floor(step / 3);
        const stageIndex = step % 3;
        const currentGen = generations[genIndex];
        if (!currentGen) return { textOverlay: 'Loading...', tags: [] };

        if (stageIndex === 0) return {
            textOverlay: `${capitalizedDataset}: Original → Crisis`,
            tags: currentGen.threat_tags_used?.map(tag => ({ key: tag, type: 'threat', text: tag })) || []
        };
        if (stageIndex === 1) return {
            textOverlay: `${capitalizedDataset}: Crisis → Solution`,
            tags: currentGen.tags_used?.map(tag => ({ key: tag, type: 'solution', text: tag })) || []
        };
        return { textOverlay: `Next Vision: ${capitalizedDataset}`, tags: [] };
    }, [step, generations, capitalizedDataset]);

    const viewStyle = {
        '--bottom-offset': tickerConfig.showBottomTicker ? tickerConfig.tickerHeight : '0px',
        '--top-offset': tickerConfig.tickerHeight,
        '--animation-duration': `${ANIMATION_DURATION}s`,
    } as React.CSSProperties;

    if (isLoading) {
        return <div className="slideshow-view" style={viewStyle}><div className="slideshow-loading">Loading Slideshow...</div></div>;
    }

    return (
        <div className="slideshow-view" style={viewStyle}>
            <NewsTicker position="top" isRotated={true} />
            <div className="slideshow-content-wrapper">
                <div className={`slideshow-content is-animating`}>
                    <div className="slideshow-image-base">
                        <div className="image-sizer" style={{ backgroundImage: `url("${baseImageUrl}")` }} />
                    </div>
                    <div className="after-image" onAnimationIteration={handleAnimationIteration}>
                        <div className="image-sizer" style={{ backgroundImage: `url("${revealImageUrl}")` }} />
                    </div>
                    <div className="slideshow-slider" />
                </div>
                <div className="slideshow-text-overlay">{textOverlay}</div>
                <div className="slideshow-tags-overlay">
                    {tags.map(tag => <div key={tag.key} className={`slideshow-tag-chip ${tag.type}`}>{tag.text}</div>)}
                </div>
            </div>
            {tickerConfig.showBottomTicker && <NewsTicker position="bottom" />}
        </div>
    );
};

export default SlideshowView;
