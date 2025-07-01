import React, { useState, useRef } from 'react';
import './TutorialModal.css';

// Using API paths for images that should always be available in the app.
const ORIGINAL_IMAGE_URL = '/api/images/IMG_20250628_213414260.jpg';
// A sample futuristic image from a public URL that fits the app's theme.
const GENERATED_IMAGE_URL = 'https://replicate.delivery/pbxt/J1f3x23p64Sj4yZt1g3gIuDqYVtj8h2qV1E3O3A3I2I2lRhIA/output.png';

const TutorialModal = ({ isVisible, onClose }) => {
    const sliderContainerRef = useRef(null);
    const [clipPosition, setClipPosition] = useState(50);

    const handleSliderMove = (e) => {
        if (!sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        if (x === undefined) return;
        setClipPosition(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
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
                    <div className="image-panel" style={{ backgroundImage: `url("${ORIGINAL_IMAGE_URL}")` }}></div>
                    <div 
                        className="image-panel after-image" 
                        style={{ 
                            backgroundImage: `url("${GENERATED_IMAGE_URL}")`, 
                            clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` 
                        }}
                    ></div>
                    <div className="slider-line" style={{ left: `${clipPosition}%` }}>
                        <div className="slider-handle"></div>
                    </div>
                </div>

                <div className="tutorial-description">
                    <p>
                        Let us imagine the future, more specifically the year 2075 in Almere, Netherlands. Due to a multitude of threats posing to this city, the city had to react to the threats by implementing some ideas for a sustainable future from student projects created in Bauhaus University Weimar in 2025. Let us all explore how these changes might affect how the current city looks. For simplicity and to make these changes more personal for exhibition visitors, we decided to show how the same changes would affect how Weimar looks.
                    </p>
                    <p>
                        <b>How to use the app:</b> Select an image from the gallery or upload your own, choose the concepts you want to apply, and click 'Transform'. Your creation will appear in the Community Gallery where all participants can vote for images of the others, which results in more happy points for Almere!
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

