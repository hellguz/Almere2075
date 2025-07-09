import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails } from '../../types';
import './TutorialModal.css';

const FALLBACK_ORIGINAL_URL = '/api/images/weimar/IMG_20250609_205051679.jpg';
const FALLBACK_GENERATED_URL = '/api/images/generated/e5524607-f8bd-4548-8d98-992dc128f304.png';

interface TutorialModalProps {
    isVisible: boolean;
    onClose: () => void;
}

/**
 * A modal component that provides a tutorial for the application.
 * It explains the two-step generation process and the overall goal of the exhibition.
 * @param {TutorialModalProps} props The component props.
 * @returns {JSX.Element | null} The rendered TutorialModal component or null.
 */
const TutorialModal: React.FC<TutorialModalProps> = ({ isVisible, onClose }) => {
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [clipPosition, setClipPosition] = useState(50);
    
    const [originalImageUrl, setOriginalImageUrl] = useState<string>(FALLBACK_ORIGINAL_URL);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(FALLBACK_GENERATED_URL);

    useEffect(() => {
        if (isVisible) {
            const fetchImagePair = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/random-generation?dataset=weimar`);
                    if (!response.ok) {
                         throw new Error(`Failed to fetch random generation: ${response.status}`);
                    }
                    const item: GenerationDetails = await response.json();
                    
                    if (item && item.generated_image_url) {
                        setOriginalImageUrl(`${API_BASE_URL}/images/${item.dataset}/${item.original_image_filename}`);
                        setGeneratedImageUrl(`${API_BASE_URL}/${item.generated_image_url}`);
                    }
                } catch (error) {
                    console.error("Could not fetch dynamic tutorial image, using fallback.", error);
                    setOriginalImageUrl(FALLBACK_ORIGINAL_URL);
                    setGeneratedImageUrl(FALLBACK_GENERATED_URL);
                }
            };
            
            fetchImagePair();
        }
    }, [isVisible]);

    const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        if (clientX === undefined) return;
        setClipPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    };

    if (!isVisible) return null;

    return (
        <div className={`tutorial-modal-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}>
            <div className="tutorial-modal-content" onClick={(e) => e.stopPropagation()}>

                <div 
                    className="tutorial-slider-container" 
                    ref={sliderContainerRef} 
                    onMouseMove={handleSliderMove} 
                    onTouchMove={handleSliderMove}
                >
                    <div className="image-panel" style={{ backgroundImage: `url("${originalImageUrl}")` }}></div>
                    <div 
                        className="image-panel after-image" 
                        style={{ 
                            backgroundImage: `url("${generatedImageUrl}")`, 
                            clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` 
                        }}
                    ></div>
                    <div className="slider-line" style={{ left: `${clipPosition}%` }}>
                      <div className="slider-handle"></div>
                    </div>
                </div>

                <div className="tutorial-description">
                    <p>
                        Welcome to the <b>Almere 2075 AI Exhibition</b>, an interactive exploration of our urban future based on the speculative design work of Bauhaus-Universität Weimar students.
                    </p>
                    <p>
                        <b>The process is a two-step transformation:</b>
                        <br />
                        <b><span style={{color: 'var(--color-error)'}}>1. VISUALIZE THE CRISIS:</span></b> First, select a "Crisis" tag (like Extreme Flooding) to see how a potential threat could impact a city if no action is taken.
                        <br />
                        <b><span style={{color: 'var(--color-system)'}}>2. ARCHITECT THE SOLUTION:</span></b> Next, from that crisis image, choose one or more "Solution" concepts (like Sponge Parks or Modular Housing) to generate a vision of a resilient, adapted future.
                    </p>
                    <p>
                        Every image you create joins the <b>Community Gallery</b>. Explore the gallery to see what others have imagined and vote for the futures you find most compelling!
                    </p>
                </div>

                <button className="tutorial-close-button" onClick={onClose}>
                    LET'S START
                </button>
            </div>
        </div>
    );
};

export default TutorialModal;
