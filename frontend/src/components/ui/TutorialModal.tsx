import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails } from '../../types';
import './TutorialModal.css';

const FALLBACK_ORIGINAL_URL = '/api/images/weimar/IMG_20250628_213414260.jpg';
const FALLBACK_GENERATED_URL = '/api/images/generated/a433b906-ee2a-45fc-9d61-7702dd8ee903.png';

interface TutorialModalProps {
    isVisible: boolean;
    onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isVisible, onClose }) => {
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [clipPosition, setClipPosition] = useState(50);
    
    const [originalImageUrl, setOriginalImageUrl] = useState<string>(FALLBACK_ORIGINAL_URL);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(FALLBACK_GENERATED_URL);

    useEffect(() => {
        if (isVisible) {
            const fetchImagePair = async () => {
                try {
                    // Fetch from 'weimar' dataset for a consistent tutorial experience
                    const response = await fetch(`${API_BASE_URL}/public-gallery?dataset=weimar`);
                    if (!response.ok) {
                         throw new Error(`Failed to fetch public gallery with status: ${response.status}`);
                    }
                    const galleryItems: GenerationDetails[] = await response.json();
                    
                    if (galleryItems && galleryItems.length > 0 && galleryItems[0].generated_image_url) {
                        const firstItem = galleryItems[0];
                        setOriginalImageUrl(`${API_BASE_URL}/images/${firstItem.dataset}/${firstItem.original_image_filename}`);
                        setGeneratedImageUrl(`${API_BASE_URL}/${firstItem.generated_image_url}`);
                    }
                } catch (error) {
                    console.error("Could not fetch dynamic tutorial image, using fallback.", error);
                    // Reset to fallbacks in case of error
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
                        This installation invites you to explore the future of urban living. It showcases a speculative design study by students of Bauhaus-Universität Weimar, who have reimagined the Dutch city of Almere for the year 2075. The project confronts critical future challenges, such as rising sea levels and resource scarcity, by proposing innovative urban and architectural solutions. To make these future scenarios tangible, this tool uses AI to transform photographs of our own city, Weimar, alongside images of Almere. You are invited to visualize how familiar spaces could evolve when faced with the need for radical new strategies like 'Sponge Parks' that manage water or 'Circular Economy Hubs' that localize production.
                    </p>
                    <p>
                        <b>Participate in this process of urban transformation:</b>
                        <br />
                        <b>1. Select a Site:</b> Begin by selecting a contemporary photograph from either the Weimar or Almere gallery, or upload an image of your own.
                        <br />
                        <b>2. Apply a Strategy:</b> Choose from a palette of design concepts developed by the students. Each represents a different strategy for a more resilient future.
                        <br />
                        <b>3. Generate Your Vision:</b> Activate the AI to generate a unique visual narrative, showing how your chosen site adapts based on the selected strategy.
                    </p>
                    <p>
                        Every image created contributes to the Community Gallery, a collective archive of possible futures. We encourage you to explore the gallery, see the visions created by others, and vote for the most compelling transformations. Your participation helps shape a dynamic picture of our shared urban future.
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