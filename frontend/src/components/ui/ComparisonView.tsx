import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import type { GenerationDetails } from '../../types';
import './ComparisonView.css';

type ComparisonMode = 'slider' | 'side-by-side';

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

    // Refs for arrow calculations
    const sbsWrapperRef = useRef<HTMLDivElement>(null);
    const threatPanelRef = useRef<HTMLDivElement>(null);
    const solutionPanelRef = useRef<HTMLDivElement>(null);
    const originalPanelRef = useRef<HTMLDivElement>(null);
    const [arrowStyles, setArrowStyles] = useState({ threat: {}, solution: {} });

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

    // Effect to calculate arrow positions for side-by-side view
    useEffect(() => {
        if (mode === 'side-by-side' && sbsWrapperRef.current && threatPanelRef.current && solutionPanelRef.current && originalPanelRef.current) {
            const calculateArrows = () => {
                const containerRect = sbsWrapperRef.current!.getBoundingClientRect();
                const threatRect = threatPanelRef.current!.getBoundingClientRect();
                const solutionRect = solutionPanelRef.current!.getBoundingClientRect();
                const originalRect = originalPanelRef.current!.getBoundingClientRect();

                const getArrowStyle = (targetRect: DOMRect) => {
                    const startX = originalRect.left + originalRect.width / 2 - containerRect.left;
                    const startY = originalRect.top + originalRect.height / 2 - containerRect.top;
                    const endX = targetRect.left + targetRect.width / 2 - containerRect.left;
                    const endY = targetRect.top + targetRect.height / 2 - containerRect.top;
                    
                    const dx = endX - startX;
                    const dy = endY - startY;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
                    
                    return {
                        left: `${startX}px`,
                        top: `${startY}px`,
                        height: `${length}px`,
                        transform: `rotate(${angle}deg)`,
                    };
                };
                
                setArrowStyles({
                    threat: getArrowStyle(threatRect),
                    solution: getArrowStyle(solutionRect),
                });
            };
            
            calculateArrows();
            window.addEventListener('resize', calculateArrows);
            return () => window.removeEventListener('resize', calculateArrows);
        }
    }, [mode, generationDetails, isVisible]);


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
            {!isModal && (
                <div className="floating-controls-top">
                    <div className="view-mode-toggle">
                        <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>3-Way</button>
                        <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                    </div>
                </div>
            )}
           <div className="comparison-main-area">
                <div className="comparison-view-wrapper">
                    {mode === 'side-by-side' ? (
                        <div className="comparison-view side-by-side" ref={sbsWrapperRef}>
                            <div className="sbs-top-row">
                                <div ref={threatPanelRef} className="image-panel" style={{backgroundImage: `url("${threatImageUrl}")`}}><div className="image-header">CRISIS</div></div>
                                <div ref={solutionPanelRef} className="image-panel" style={{backgroundImage: `url("${solutionImageUrl}")`}}><div className="image-header">SOLUTION</div></div>
                            </div>
                            <div className="sbs-bottom-row">
                                <div ref={originalPanelRef} className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}><div className="image-header">ORIGINAL</div></div>
                            </div>
                            <div className="arrow-container">
                                <div className="arrow threat" style={arrowStyles.threat}></div>
                                <div className="arrow solution" style={arrowStyles.solution}></div>
                            </div>
                        </div>
                    ) : (
                         <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                             <div className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}>
                                <div className="image-header">ORIGINAL</div>
                             </div>
                            <div className="image-panel after-image" style={{backgroundImage: `url("${solutionImageUrl}")`, clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}>
                                 <div className="image-header">SOLUTION</div>
                            </div>
                            <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                        </div>
                    )}
                </div>
            </div>
           
            <div className={`comparison-footer ${isModal ? 'is-modal' : ''}`}>
                <div className="footer-left">
                     <div className="info-tags-chips">
                        <b>Solutions:</b> 
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
                            {promptButton(generationDetails.threat_prompt_text, "CRISIS PROMPT")}
                            {promptButton(generationDetails.prompt_text, "SOLUTION PROMPT")}
                            <button className="hide-button" onClick={onHide} title="Remove from public gallery">REMOVE</button>
                        </>
                    )}
                     {isModal && onVote && (
                        <>
                            <button className="modal-like-button" onClick={onVote}>
                                👍 {generationDetails.votes}
                            </button>
                            {promptButton(generationDetails.prompt_text, "SHOW PROMPT")}
                        </>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default ComparisonView;
