import React, { useRef, useEffect } from 'react';
import TagSelector from '../components/ui/TagSelector';
import type { SourceImage, Tag } from '../types';
import './TransformView.css';

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
                            <div className="transform-step-title">
                                <span className="step-number">2</span>
                                ARCHITECT THE SOLUTION
                            </div>
                            <p className="transform-step-description">Now, choose one or more concepts to build a resilient future.</p>
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