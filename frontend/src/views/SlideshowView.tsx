import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import type { GenerationDetails } from '../types';
import NewsTicker from '../components/ui/NewsTicker';
import LogoPanel from '../components/ui/LogoPanel';
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

const getImageUrl = (gen: GenerationDetails, type: 'original' | 'threat' | 'generated', dataset: string): string => {
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
    const [imageQueue, setImageQueue] = useState<string[]>([]);
    const [generationQueue, setGenerationQueue] = useState<GenerationDetails[]>([]);
    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [baseImageUrl, setBaseImageUrl] = useState('');
    const [revealImageUrl, setRevealImageUrl] = useState('');

    const dataset = useMemo(() => new URLSearchParams(window.location.search).get('set') || 'almere', []);

    const handleAnimationIteration = useCallback(() => {
        const newStep = step + 1;
        
        const isFinishingLtrPass = step % 2 === 0;
        const nextImageUrlInSequence = imageQueue[newStep + 1];

        if (isFinishingLtrPass) {
            if (nextImageUrlInSequence) setBaseImageUrl(nextImageUrlInSequence);
        } else {
            if (nextImageUrlInSequence) setRevealImageUrl(nextImageUrlInSequence);
        }
        
        const nextGenIndex = Math.floor((newStep + 3) / 3);
        if (generationQueue.length - nextGenIndex < PRELOAD_AHEAD) {
            fetchRandomGeneration(dataset).then(newGen => {
                if (newGen) {
                    const newImageUrls = [
                        getImageUrl(newGen, 'original', dataset),
                        getImageUrl(newGen, 'threat', dataset),
                        getImageUrl(newGen, 'generated', dataset)
                    ];
                    Promise.all(newImageUrls.map(preloadImage)).then(() => {
                        setGenerationQueue(g => [...g, newGen]);
                        setImageQueue(q => [...q, ...newImageUrls]);
                    });
                }
            });
        }
        setStep(newStep);
    }, [step, imageQueue, generationQueue.length, dataset]);
    
    useEffect(() => {
        const init = async () => {
            try {
                const initialGens = (await Promise.all(
                    [...Array(PRELOAD_AHEAD)].map(() => fetchRandomGeneration(dataset))
                )).filter((g): g is GenerationDetails => g !== null);

                if (initialGens.length < 2) throw new Error("Could not fetch enough initial generations.");

                const allImageUrls: string[] = [];
                initialGens.forEach(gen => {
                    allImageUrls.push(getImageUrl(gen, 'original', dataset));
                    allImageUrls.push(getImageUrl(gen, 'threat', dataset));
                    allImageUrls.push(getImageUrl(gen, 'generated', dataset));
                });

                await Promise.all(allImageUrls.map(preloadImage));
                
                setImageQueue(allImageUrls);
                setGenerationQueue(initialGens);
                setBaseImageUrl(allImageUrls[0]);
                setRevealImageUrl(allImageUrls[1]);
                setIsLoading(false);
            } catch (error) {
                console.error("FATAL: Could not initialize slideshow.", error);
                setIsLoading(false);
            }
        };
        init();
    }, [dataset]);

    const { stage, tags } = useMemo(() => {
        const genIndex = Math.floor(step / 3);
        const stageIndex = (step + 1) % 3;
        const currentGen = generationQueue[genIndex];
        if (!currentGen) return { stage: 0, tags: [] };

        if (stageIndex ===1 ) return {
            stage: stageIndex,
            tags: currentGen.threat_tags_used?.map(tag => ({ key: tag, type: 'threat', text: tag })) || []
        };
        
        if (stageIndex ===0 ) return {
            stage: stageIndex,
            tags: []
        };
        
        return { 
            stage: stageIndex,
            tags: currentGen.tags_used?.map(tag => ({ key: tag, type: 'solution', text: tag })) || []
        };
    }, [step, generationQueue]);

    const currentBaseImageUrl = imageQueue[step];
    const currentRevealImageUrl = imageQueue[step + 1];

    const viewStyle = {
        '--bottom-offset': tickerConfig.showBottomTicker ? tickerConfig.tickerHeight : '0px',
        '--top-offset': tickerConfig.tickerHeight,
        '--animation-duration': `${ANIMATION_DURATION}s`,
    } as React.CSSProperties;

    if (isLoading || !currentBaseImageUrl || !currentRevealImageUrl) {
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
                
                <div className="slideshow-info-panel">
                    <div className="info-step-item">
                        <span className={`info-step-number active ${stage === 0 ? 'current' : ''}`}>1</span>
                        <span className="info-step-label">Original 2025</span>
                    </div>
                    <div className="info-step-connector" />
                    <div className="info-step-item">
                        <span className={`info-step-number ${stage >= 1 ? 'active' : ''} ${stage === 1 ? 'current' : ''} threat`}>2</span>
                        <span className="info-step-label">Crisis 2075</span>
                    </div>
                    <div className="info-step-connector" />
                    <div className="info-step-item">
                        <span className={`info-step-number ${stage >= 2 ? 'active' : ''} ${stage === 2 ? 'current' : ''} solution`}>3</span>
                        <span className="info-step-label">Solution</span>
                    </div>
                </div>

                <div className="slideshow-tags-overlay">
                    {tags.map(tag => <div key={tag.key} className={`slideshow-tag-chip ${tag.type}`}>{tag.text}</div>)}
                </div>
            </div>
            <LogoPanel />
            {tickerConfig.showBottomTicker && <NewsTicker position="bottom" />}
        </div>
    );
};

export default SlideshowView;
