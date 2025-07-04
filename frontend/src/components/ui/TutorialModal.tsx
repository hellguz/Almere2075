import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails } from '../../types';
import './TutorialModal.css';

// MODIFIED: Updated fallback image paths to be correct
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
                        // FIXED: Construct image URLs correctly based on the new data structure
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
                        Let us imagine the future, more specifically the year 2075 in Almere, Netherlands.
                        Due to a multitude of threats posing to this city, the city had to react to the threats by implementing some ideas for a sustainable future from student projects created in Bauhaus University Weimar in 2025. Let us all explore how these changes might affect how the current city looks.
                        For simplicity and to make these changes more personal for exhibition visitors, we decided to show how the same changes would affect how Weimar looks.
                    </p>
                    <p>
                        <b>How to use the app:</b> Select an image from the gallery or upload your own, choose the concepts you want to apply, and click 'Transform'.
                        Your creation will appear in the Community Gallery where all participants can vote for images of the others, which results in more happy points for Almere!
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