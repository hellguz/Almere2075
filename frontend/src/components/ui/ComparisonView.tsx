import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails, SourceImage } from '../../types';
import './ComparisonView.css';

type ComparisonMode = 'slider' | 'side-by-side';

/**
 * @typedef {object} ComparisonViewProps
 * @property {GenerationDetails | null} generationDetails - The details of the generated image.
 * @property {SourceImage | null} sourceImage - The original source image.
 * @property {boolean} isVisible - Whether the view is currently visible.
 * @property {ComparisonMode} mode - The current comparison mode ('slider' or 'side-by-side').
 * @property {(mode: ComparisonMode) => void} onModeChange - Callback to change the comparison mode.
 * @property {boolean} [isModal=false] - If true, renders in a modal-specific layout.
 * @property {(name: string) => void} [onSetName] - Callback to set the creator's name.
 * @property {() => void} [onHide] - Callback to hide the generation from the gallery.
 * @property {() => void} [onVote] - Callback to vote for the generation.
 */
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

const SLIDER_VIEW_SCALE_FACTOR = 0.95;

/**
 * A component to display a side-by-side or slider comparison of two images.
 * It also includes controls for naming, hiding, and voting on the generation.
 * @param {ComparisonViewProps} props - The component props.
 * @returns {JSX.Element | null} The rendered ComparisonView component or null.
 */
const ComparisonView: React.FC<ComparisonViewProps> = ({ generationDetails, sourceImage, isVisible, mode, onModeChange, isModal = false, onSetName, onHide, onVote }) => {
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const [clipPosition, setClipPosition] = useState(50);
    const [creatorName, setCreatorName] = useState('');
    const [nameSaved, setNameSaved] = useState(false);

    // MODIFIED: This effect now ONLY runs for the main view, not the modal view,
    // to prevent it from incorrectly resizing the component when it's inside the modal.
    useEffect(() => {
        if (isVisible && !isModal && viewRef.current) {
            const setViewHeight = () => {
                if (viewRef.current) {
                    // This sets the height to the actual visible area on mobile.
                    viewRef.current.style.height = `${window.innerHeight}px`;
                }
            };
            setViewHeight();
            window.addEventListener('resize', setViewHeight);
            return () => window.removeEventListener('resize', setViewHeight);
        }
    }, [isVisible, isModal]);

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
    
    const viewWrapperStyle = {
        transform: mode === 'slider' ? `scale(${SLIDER_VIEW_SCALE_FACTOR})` : 'scale(1)',
    };

    const promptButton = (
        <div className="prompt-container">
            <div className="prompt-button">
                SHOW PROMPT
            </div>
            {generationDetails.prompt_text && (
                <div className="prompt-panel">{generationDetails.prompt_text}</div>
            )}
        </div>
    );

    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`} ref={viewRef}>
            {!isModal && (
                <div className="floating-controls-top">
                    <div className="view-mode-toggle">
                        <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>Side-by-Side</button>
                        <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                    </div>
                </div>
            )}
           <div className="comparison-main-area">
                <div className="comparison-view-wrapper" style={viewWrapperStyle}>
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
            </div>
           
            <div className={`comparison-footer ${isModal ? 'is-modal' : ''}`}>
                <div className="footer-left">
                    <div className="info-tags-chips">
                        <b>Concepts:</b> 
                        {generationDetails.tags_used?.map(tag => <span key={tag} className="tag-chip">{tag}</span>) || <span className="tag-chip">N/A</span>}
                    </div>
                    <div className="info-creator">
                        <b>By:</b> {generationDetails.creator_name || 'Anonymous'}
                    </div>
                </div>

                <div className="footer-center">
                    {!isModal && onSetName && (
                         <div className="name-input-container">
                            <input type="text" placeholder="Sign your creation..." value={creatorName} onChange={(e) => setCreatorName(e.target.value)} disabled={nameSaved} />
                            <button onClick={handleNameSubmit} disabled={nameSaved || !creatorName.trim()} className={nameSaved ? "save-button-saved" : "save-button"}>
                                {nameSaved ? '✓ SAVED' : 'SAVE NAME'}
                            </button>
                        </div>
                    )}
                </div>
                 
                <div className="footer-right">
                    {!isModal && onHide && (
                        <>
                            {promptButton}
                            <button className="hide-button" onClick={onHide} title="Remove from public gallery">REMOVE</button>
                        </>
                    )}
                    {isModal && onVote && (
                        <>
                            <button className="modal-like-button" onClick={onVote}>
                                👍 {generationDetails.votes}
                            </button>
                            {promptButton}
                        </>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default ComparisonView;