import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import ComparisonView from '../components/ui/ComparisonView';
import DynamicCommunityGallery from '../components/community/DynamicCommunityGallery';
import type { GenerationDetails } from '../types';
import './CommunityGalleryView.css';

interface CommunityGalleryViewProps {
    isVisible: boolean;
    items: GenerationDetails[];
    modalItem: GenerationDetails | null;
    onVote: (id: string) => Promise<void>;
    onItemSelect: (item: GenerationDetails) => void;
    onModalClose: () => void;
    fetchGallery: () => void;
}

type ComparisonMode = 'slider' | 'side-by-side';

const CommunityGalleryView: React.FC<CommunityGalleryViewProps> = ({
    isVisible,
    items,
    modalItem,
    onVote,
    onItemSelect,
    onModalClose,
    fetchGallery,
}) => {
    const [modalComparisonMode, setModalComparisonMode] = useState<ComparisonMode>('side-by-side');
    const modalRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const panState = useRef({ isPanning: false, startCoords: { x: 0, y: 0 }, hasDragged: false });

    useEffect(() => {
        if (isVisible && viewRef.current) {
            const setViewHeight = () => {
                if (viewRef.current) {
                    viewRef.current.style.height = `${window.innerHeight}px`;
                }
            };
            setViewHeight();
            window.addEventListener('resize', setViewHeight);
            return () => window.removeEventListener('resize', setViewHeight);
        }
    }, [isVisible]);

    useEffect(() => {
        if (isVisible && !modalItem) {
            fetchGallery();
        }
    }, [isVisible, modalItem, fetchGallery]);

    useEffect(() => {
        if (modalItem && modalRef.current) {
            const setModalHeight = () => {
                if (modalRef.current) {
                    modalRef.current.style.height = `${window.innerHeight}px`;
                }
            };
            setModalHeight();
            window.addEventListener('resize', setModalHeight);
            return () => window.removeEventListener('resize', setModalHeight);
        }
    }, [modalItem]);

    const handleModalVote = useCallback(() => {
        if (!modalItem) return;
        onVote(modalItem.id);
    }, [modalItem, onVote]);
    
    // Logic to distinguish between a drag and a simple click/tap
    const handlePointerDown = (e: React.PointerEvent) => {
        panState.current.isPanning = true;
        panState.current.hasDragged = false; // Reset drag state on new interaction
        panState.current.startCoords = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!panState.current.isPanning) return;
        const dx = e.clientX - panState.current.startCoords.x;
        const dy = e.clientY - panState.current.startCoords.y;
        // If the mouse has moved more than a few pixels, we consider it a drag
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            panState.current.hasDragged = true;
        }
    };

    const handlePointerUp = () => {
        panState.current.isPanning = false;
    };

    // This is the new, safe handler that we pass down to the children.
    // It only calls the original onItemSelect if the user has NOT dragged.
    const handleItemSelect = (item: GenerationDetails) => {
        if (!panState.current.hasDragged) {
            onItemSelect(item);
        }
    };

    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`} ref={viewRef}>
            <div className="gallery-info-text">
                <p>Explore visions of Almere 2075 created by others. <b>Drag to explore</b> and <b>tap a card to see details</b>. Give a "👍" to your favorites!</p>
            </div>
            
            {/* FIXED: The pointer handlers are now on the Canvas itself, not the wrapper div.
                This ensures events are handled correctly by react-three-fiber. */}
            <div className="community-canvas-container">
                <Canvas 
                    orthographic 
                    camera={{ position: [0, 0, 10], zoom: 100 }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    <ambientLight intensity={3} />
                    {items.length > 0 && (
                        <DynamicCommunityGallery
                            items={items}
                            onItemSelect={handleItemSelect} // Use the new safe handler
                            onVote={(e, id) => onVote(id)}   // Adapt the handler signature
                            isInBackground={!!modalItem}
                        />
                    )}
                </Canvas>
            </div>

            {modalItem && (
                 <div className="modal-overlay" onClick={onModalClose} ref={modalRef}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <button className="modal-close-button" onClick={onModalClose}>← CLOSE</button>
                            <div className="view-mode-toggle">
                                <button className={modalComparisonMode === 'side-by-side' ? 'active' : ''} onClick={() => setModalComparisonMode('side-by-side')}>Side-by-Side</button>
                                <button className={modalComparisonMode === 'slider' ? 'active' : ''} onClick={() => setModalComparisonMode('slider')}>Slider</button>
                            </div>
                        </div>
                        <ComparisonView
                            generationDetails={modalItem}
                            isVisible={true}
                            isModal={true}
                            mode={modalComparisonMode}
                            onModeChange={setModalComparisonMode}
                            onVote={handleModalVote}
                            sourceImage={null}
                        />
                    </div>
                </div>
             )}
        </div>
    );
};

export default CommunityGalleryView;