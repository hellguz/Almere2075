import React, { useRef, useEffect } from 'react';
import TagSelector from '../components/ui/TagSelector';
import type { SourceImage, Tag } from '../types';
import './TransformView.css';

interface TransformViewProps {
    sourceImage: SourceImage | null;
    isVisible: boolean;
    isProcessing: boolean;
    onTransform: () => void;
    tags: Tag[];
    selectedTags: string[];
    onTagToggle: (tagId: string) => void;
}

const TransformView: React.FC<TransformViewProps> = ({ sourceImage, isVisible, isProcessing, onTransform, tags, selectedTags, onTagToggle }) => {
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


    if (!sourceImage) return null;
    return (
        <div ref={viewRef} className={`transform-view ${isVisible ? 'visible' : ''}`}>
            <div className="transform-content">
                <div className="main-image-container">
                    <p className="transform-step-title">1. Source Image</p>
                    <img src={sourceImage.url} alt="Selected for transformation" className="main-image" />
                 </div>
                <div className="transform-options">
                    <TagSelector tags={tags} selectedTags={selectedTags} onTagToggle={onTagToggle} />
                    <div className="transform-controls">
                        <button className="transform-action-button" onClick={onTransform} disabled={isProcessing}>
                             {isProcessing ? 'TRANSFORMING...' : '3. TRANSFORM TO ALMERE 2075'}
                        </button>
                    </div>
                </div>
             </div>
            {isProcessing && <div className="scanline"></div>}
        </div>
    );
};

export default TransformView;