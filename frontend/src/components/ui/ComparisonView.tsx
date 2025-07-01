import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails, SourceImage } from '../../types';
import './ComparisonView.css';

type ComparisonMode = 'slider' | 'side-by-side';

interface ComparisonViewProps {
    generationDetails: GenerationDetails | null;
    sourceImage: SourceImage | null;
    isVisible: boolean;
    mode: ComparisonMode;
    onModeChange: (mode: ComparisonMode) => void;
    isModal?: boolean;
    onSetName?: (name: string) => void;
    onHide?: () => void;
    onVote?: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ generationDetails, sourceImage, isVisible, mode, onModeChange, isModal = false, onSetName, onHide, onVote }) => {
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [clipPosition, setClipPosition] = useState(50);
    const [creatorName, setCreatorName] = useState('');
    const [nameSaved, setNameSaved] = useState(false);

    useEffect(() => {
        if (generationDetails) {
            setCreatorName(generationDetails.creator_name || '');
            setNameSaved(!!generationDetails.creator_name);
        }
    }, [generationDetails]);

    const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        if (clientX === undefined) return;
        setClipPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    };

    const handleNameSubmit = () => {
        if (creatorName.trim() && onSetName) {
            onSetName(creatorName);
            setNameSaved(true);
        }
    };

    if (!generationDetails) return null;
    
    const originalImageUrl = sourceImage?.url || `${API_BASE_URL}/images/${generationDetails.original_image_filename}`;
    const outputImageUrl = generationDetails.generated_image_url ? `${API_BASE_URL}/images/${generationDetails.generated_image_url}` : '';
    
    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`}>
            {!isModal && (
                <div className="floating-controls-top">
                    <div className="view-mode-toggle">
                        <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>Side-by-Side</button>
                        <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                    </div>
                </div>
            )}
            <div className="comparison-main-area">
                {mode === 'side-by-side' && (
                    <div className="comparison-view side-by-side">
                        <div className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}><div className="image-header">SOURCE</div></div>
                        <div className="image-panel" style={{backgroundImage: `url("${outputImageUrl}")`}}><div className="image-header">ALMERE 2075</div></div>
                     </div>
                )}
                {mode === 'slider' && (
                    <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                        <div className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}>
                            <div className="image-header">SOURCE</div>
                        </div>
                        <div className="image-panel after-image" style={{backgroundImage: `url("${outputImageUrl}")`, clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}>
                             <div className="image-header">ALMERE 2075</div>
                        </div>
                        <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                     </div>
                )}
            </div>
           
            <div className="comparison-footer">
                <div className="footer-left">
                     <div className="info-tags">
                         <b>Concepts:</b> {generationDetails.tags_used?.join(', ') || 'N/A'}
                    </div>
                    <div className="info-creator">
                        <b>By:</b> {generationDetails.creator_name || 'Anonymous'}
                    </div>
                </div>
                {!isModal && onSetName && (
                    <div className="footer-center">
                        <div className="name-input-container">
                            <input type="text" placeholder="Sign your creation..." value={creatorName} onChange={(e) => setCreatorName(e.target.value)} disabled={nameSaved} />
                            <button onClick={handleNameSubmit} disabled={nameSaved || !creatorName.trim()} className={nameSaved ? "save-button-saved" : "save-button"}>
                                 {nameSaved ? '✓ SAVED' : 'SAVE NAME'}
                            </button>
                        </div>
                    </div>
                 )}
                <div className="footer-right">
                    {!isModal && onHide && (
                        <button className="hide-button" onClick={onHide} title="Remove from public gallery">REMOVE</button>
                    )}
                    {isModal && onVote && (
                        <button className="modal-like-button" onClick={onVote}>
                            👍 {generationDetails.votes}
                        </button>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default ComparisonView;

