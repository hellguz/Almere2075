import React, { useRef, useEffect } from 'react';
import TagSelector from '../components/ui/TagSelector';
import type { SourceImage, Tag } from '../types';
import './TransformView.css';
import { useStore } from '../store';

/**
 * @typedef {object} TransformViewProps
 * @property {SourceImage | null} sourceImage - The source image for the transformation.
 * @property {SourceImage | null} threatImage - The intermediate threat image.
 * @property {boolean} isVisible - Whether the view is currently visible.
 * @property {boolean} isProcessing - Whether an AI generation is in progress.
 * @property {'threat' | 'solution'} transformStep - The current step of the transformation.
 * @property {() => void} onGenerateThreat - Callback to start threat image generation.
 * @property {() => void} onGenerateSolution - Callback to start solution image generation.
 * @property {Tag[]} availableThreatTags - The list of available threat tags.
 * @property {string[]} selectedThreatTags - The IDs of the selected threat tags.
 * @property {(tagId: string) => void} onThreatTagToggle - Callback to toggle a threat tag.
 * @property {Tag[]} availableSolutionTags - The list of available solution tags.
 * @property {string[]} selectedSolutionTags - The IDs of the selected solution tags.
 * @property {(tagId: string) => void} onSolutionTagToggle - Callback to toggle a solution tag.
 */
interface TransformViewProps {
    sourceImage: SourceImage | null;
    threatImage: SourceImage | null;
    isVisible: boolean;
    isProcessing: boolean;
    transformStep: 'threat' | 'solution';
    onGenerateThreat: () => void;
    onGenerateSolution: () => void;
    availableThreatTags: Tag[];
    selectedThreatTags: string[]; 
    onThreatTagToggle: (tagId: string) => void; 
    availableSolutionTags: Tag[];
    selectedSolutionTags: string[];
    onSolutionTagToggle: (tagId: string) => void;
}

/**
 * A view for the main image transformation process, guiding the user
 * through the two steps of 'threat' and 'solution' generation.
 * @param {TransformViewProps} props The component props.
 * @returns {JSX.Element | null} The rendered TransformView component or null.
 */
const TransformView: React.FC<TransformViewProps> = ({ 
    sourceImage, 
    threatImage,
    isVisible, 
    isProcessing, 
    transformStep,
    onGenerateThreat,
    onGenerateSolution,
    availableThreatTags,
    selectedThreatTags,
    onThreatTagToggle,
    availableSolutionTags,
    selectedSolutionTags,
    onSolutionTagToggle,
}) => {
    const viewRef = useRef<HTMLDivElement>(null);
    const selectedThreats = availableThreatTags.filter(tag => selectedThreatTags.includes(tag.id));
    // ADDED: Get the hide action from the store
    const handleHideSourceImage = useStore(state => state.actions.handleHideSourceImage);

    useEffect(() => {
        const setViewHeight = () => {
            if (viewRef.current) {
                viewRef.current.style.height = `${window.innerHeight}px`;
            }
        };

        if (isVisible) {
             setViewHeight();
             window.addEventListener('resize', setViewHeight);
        }

        return () => {
            window.removeEventListener('resize', setViewHeight);
        };
    }, [isVisible]);

    // ADDED: Effect to listen for the "Delete" key press to hide the source image
    useEffect(() => {
        if (!isVisible) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Delete') {
                handleHideSourceImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVisible, handleHideSourceImage]); 

    const imageToShow = transformStep === 'threat' ? sourceImage : threatImage;

    if (!imageToShow) return null;

    return (
        <div ref={viewRef} className={`transform-view ${isVisible ? 'visible' : ''} ${transformStep === 'threat' ? 'step-threat' : 'step-solution'}`}>
            <div className="transform-content">
                <div className="main-image-container">
                    <img src={imageToShow.url} alt="Transformation subject" className="main-image" />
                </div>
                <div className="transform-options">
                    {transformStep === 'threat' ? (
                        <>
                            <div className="transform-step-title">
                                <span className="step-number">1</span>
                                VISUALIZE THE CRISIS
                            </div>
                            <p className="transform-step-description">Select one or more crisis scenarios to see their potential impact on the city.</p>
                            <TagSelector 
                                title=""
                                tags={availableThreatTags} 
                                selectedTags={selectedThreatTags} 
                                onTagToggle={onThreatTagToggle}
                                singleSelection={false}
                            />
                            <button 
                                className="transform-action-button" 
                                onClick={onGenerateThreat} 
                                disabled={isProcessing || selectedThreatTags.length === 0}
                            >
                                {isProcessing ? 'GENERATING CRISIS...' : 'GENERATE CRISIS IMAGE'}
                            </button>
                        </>
                    ) : (
                        <>
                            {selectedThreats.length > 0 && (
                                <div className="threat-context">
                                    <h4 className="threat-context-title">Based on Crisis:</h4>
                                    <div className="threat-context-tags">
                                        {selectedThreats.map(tag => (
                                            <span key={tag.id} className="context-tag-chip">{tag.name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="transform-step-title">
                                <span className="step-number">2</span>
                                ARCHITECT THE SOLUTION
                            </div>
                            <p className="transform-step-description">Now, choose one or more concepts to build a resilient future from the crisis.</p>
                            <TagSelector 
                                title=""
                                tags={availableSolutionTags} 
                                selectedTags={selectedSolutionTags} 
                                onTagToggle={onSolutionTagToggle} 
                            />
                            <button 
                                className="transform-action-button" 
                                onClick={onGenerateSolution} 
                                disabled={isProcessing || selectedSolutionTags.length === 0}
                            >
                                {isProcessing ? 'GENERATING SOLUTION...' : 'GENERATE SOLUTION IMAGE'}
                            </button>
                        </>
                    )}
                </div>
            </div>
            {isProcessing && <div className="scanline"></div>}
        </div>
    );
};

export default TransformView;
