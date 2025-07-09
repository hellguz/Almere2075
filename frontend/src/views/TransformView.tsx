import React, { useRef, useEffect } from 'react';
import TagSelector from '../components/ui/TagSelector';
import type { SourceImage, Tag } from '../types';
import './TransformView.css';
import { useIsMobile } from '../hooks/useIsMobile';

interface TransformViewProps {
    sourceImage: SourceImage | null;
    threatImage: SourceImage | null;
    isVisible: boolean;
    isProcessing: boolean;
    transformStep: 'threat' | 'solution';
    onGenerateThreat: () => void;
    onGenerateSolution: () => void;
    availableThreatTags: Tag[];
    selectedThreatTag: string | null;
    onThreatTagSelect: (tagId: string) => void;
    availableSolutionTags: Tag[];
    selectedSolutionTags: string[];
    onSolutionTagToggle: (tagId: string) => void;
}

const TransformView: React.FC<TransformViewProps> = ({ 
    sourceImage, 
    threatImage,
    isVisible, 
    isProcessing, 
    transformStep,
    onGenerateThreat,
    onGenerateSolution,
    availableThreatTags,
    selectedThreatTag,
    onThreatTagSelect,
    availableSolutionTags,
    selectedSolutionTags,
    onSolutionTagToggle,
}) => {
    const viewRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

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
        <div ref={viewRef} className={`transform-view ${isVisible ? 'visible' : ''}`}>
            <div className="transform-content">
                <div className="main-image-container">
                    <p className="transform-step-title">
                        {transformStep === 'threat' ? 'Step 1: The Crisis Scenario' : 'Step 2: The Resilient Solution'}
                    </p>
                    <img src={imageToShow.url} alt="Transformation subject" className="main-image" />
                </div>
                <div className="transform-options">
                    {transformStep === 'threat' ? (
                        <>
                            <TagSelector 
                                title="1. Choose a crisis scenario"
                                tags={availableThreatTags} 
                                selectedTags={selectedThreatTag ? [selectedThreatTag] : []} 
                                onTagToggle={onThreatTagSelect}
                                singleSelection={true}
                            />
                            <button 
                                className="transform-action-button" 
                                onClick={onGenerateThreat} 
                                disabled={isProcessing || !selectedThreatTag}
                            >
                                {isProcessing ? 'GENERATING THREAT...' : (isMobile ? '2. GENERATE THREAT' : '2. GENERATE THREAT IMAGE')}
                            </button>
                        </>
                    ) : (
                        <>
                            <TagSelector 
                                title="3. Choose concepts to build a better future"
                                tags={availableSolutionTags} 
                                selectedTags={selectedSolutionTags} 
                                onTagToggle={onSolutionTagToggle} 
                            />
                            <button 
                                className="transform-action-button" 
                                onClick={onGenerateSolution} 
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'GENERATING SOLUTION...' : (isMobile ? '4. GENERATE SOLUTION' : '4. GENERATE SOLUTION IMAGE')}
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
