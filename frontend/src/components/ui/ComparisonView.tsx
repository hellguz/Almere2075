import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails } from '../../types';
import './ComparisonView.css';

type ComparisonMode = 'slider' | 'side-by-side';

/**
 * @typedef {object} ComparisonViewProps
 * @property {GenerationDetails | null} generationDetails - The details of the generated images.
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
    isVisible: boolean;
    mode: ComparisonMode;
    onModeChange: (mode: ComparisonMode) => void;
    isModal?: boolean;
    onSetName?: (name: string) => void;
    onHide?: () => void;
    onVote?: () => void;
}

/**
 * A component to display a comparison of original, threat, and solution images.
 * @param {ComparisonViewProps} props - The component props.
 * @returns {JSX.Element | null} The rendered ComparisonView component or null.
 */
const ComparisonView: React.FC<ComparisonViewProps> = ({ generationDetails, isVisible, mode, onModeChange, isModal = false, onSetName, onHide, onVote }) => {
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const [clipPosition, setClipPosition] = useState(50);
    const [creatorName, setCreatorName] = useState('');
    const [nameSaved, setNameSaved] = useState(false);

    useEffect(() => {
        if (isVisible && !isModal && viewRef.current) {
            const setViewHeight = () => {
                if (viewRef.current) {
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

    // MODIFIED: Effect to listen for the "Delete" key press in modal view
    useEffect(() => {
        if (!isModal || !onHide) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Delete') {
                // The confirmation logic is now handled in the store action
                onHide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModal, onHide]); 

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

    const originalImageUrl = `${API_BASE_URL}/images/${generationDetails.dataset}/${generationDetails.original_image_filename}`;
    const threatImageUrl = generationDetails.threat_image_url ? `${API_BASE_URL}/${generationDetails.threat_image_url}` : '';
    const solutionImageUrl = generationDetails.generated_image_url ? `${API_BASE_URL}/${generationDetails.generated_image_url}` : '';

    const promptButton = (promptText: string | null, label: string) => (
        <div className="prompt-container">
            <div className="prompt-button">
                {label}
            </div>
            {promptText && (
                <div className="prompt-panel">{promptText}</div>
            )}
        </div>
    );

    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`} ref={viewRef}>
            <div className='comparison-content-area'>
                <div className="comparison-main-area">
                    <div className="comparison-view-wrapper">
                        {mode === 'side-by-side' ? (
                            <div className="comparison-view side-by-side">
                                <div className="sbs-top-row">
                                    <div className="image-panel">
                                        <div className="image-container">
                                            <img src={threatImageUrl} alt="Crisis" />
                                            <div className="image-header">CRISIS</div>
                                        </div>
                                        <div className="image-description threat-tags">
                                            {generationDetails.threat_tags_used?.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
                                        </div>
                                    </div>
                                    <div className="image-panel">
                                        <div className="image-container">
                                            <img src={solutionImageUrl} alt="Solution" />
                                            <div className="image-header">SOLUTION</div>
                                        </div>
                                        <div className="image-description solution-tags">
                                            {generationDetails.tags_used?.map(tag => <span key={tag} className="tag-chip">{tag}</span>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="sbs-bottom-row">
                                    <div className="image-panel">
                                        <div className="image-container">
                                            <img src={originalImageUrl} alt="Original" />
                                            <div className="image-header">ORIGINAL</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                                <div className="image-panel">
                                    <img src={originalImageUrl} alt="Original" />
                                    <div className="image-header">ORIGINAL</div>
                                </div>
                                <div className="image-panel" style={{ clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}>
                                    <img src={solutionImageUrl} alt="Solution" />
                                    <div className="image-header">SOLUTION</div>
                                </div>
                                <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                            </div>
                        )}
                    </div>
                </div>
                {!isModal && (
                    <div className="floating-controls-top">
                        <div className="view-mode-toggle">
                            <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>3-Way</button>
                            <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                        </div>
                    </div>
                )}
            </div>
           
            <div className={`comparison-footer ${isModal ? 'is-modal' : ''}`}>
                <div className="footer-left">
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
                            {promptButton(generationDetails.threat_prompt_text, "CRISIS PROMPT")}
                            {promptButton(generationDetails.prompt_text, "SOLUTION PROMPT")}
                            <button className="footer-remove-button" onClick={onHide} title="Remove this generation from the public gallery">&times;</button>
                        </>
                    )}
                     {isModal && onVote && (
                        <>
                            <button className="modal-like-button" onClick={onVote}>
                                👍 {generationDetails.votes}
                            </button>
                            {promptButton(generationDetails.prompt_text, "SHOW PROMPT")}
                            {onHide && (
                                <button className="footer-remove-button" onClick={onHide} title="Remove this generation from the public gallery">&times;</button>
                            )}
                        </>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default ComparisonView;

