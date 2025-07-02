import React, { useEffect, useCallback, useState, useRef } from 'react';
import ComparisonView from '../components/ui/ComparisonView';
import type { GenerationDetails } from '../types';
import { API_BASE_URL } from '../config';
import './CommunityGalleryView.css';

/**
 * @typedef {object} CommunityGalleryViewProps
 * @property {boolean} isVisible - Whether the view is currently visible.
 * @property {GenerationDetails[]} items - The list of gallery items to display.
 * @property {GenerationDetails | null} modalItem - The currently selected item to show in a modal.
 * @property {(id: string) => Promise<void>} onVote - Callback function to vote for an item.
 * @property {(item: GenerationDetails) => void} onItemSelect - Callback to select an item for modal view.
 * @property {() => void} onModalClose - Callback to close the modal.
 * @property {() => void} fetchGallery - Callback to fetch/refresh the gallery items.
 */
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

    useEffect(() => {
        if (isVisible && !modalItem) {
            fetchGallery();
        }
    }, [isVisible, modalItem, fetchGallery]);

    // MODIFIED: Added effect to dynamically set the modal height to the window's inner height.
    // This is the "proper fix" for the 100vh issue on mobile browsers.
    useEffect(() => {
        if (modalItem && modalRef.current) {
            const setModalHeight = () => {
                if (modalRef.current) {
                    modalRef.current.style.height = `${window.innerHeight}px`;
                }
            };
            setModalHeight(); // Set initially
            window.addEventListener('resize', setModalHeight); // Update on resize/orientation change
            return () => window.removeEventListener('resize', setModalHeight);
        }
    }, [modalItem]);


    const handleVoteClick = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
        e.stopPropagation();
        onVote(itemId);
    };

    const handleModalVote = useCallback(() => {
        if (!modalItem) return;
        onVote(modalItem.id);
    }, [modalItem, onVote]);

    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`}>
            <div className="gallery-info-text">
                <p>Explore visions of Almere 2075 created by others. <b>Give a "👍" to your favorites</b> to help the city reach its happiness goal!</p>
            </div>
            <div className="gallery-grid-container">
                {items.map(item => (
                    <div key={item.id} className="gallery-item" onClick={() => onItemSelect(item)}>
                        <div className="gallery-item-images">
                            {item.generated_image_url && <img src={`${API_BASE_URL}/images/${item.generated_image_url}`} alt="Generated" className="gallery-item-thumb generated"/>}
                            <img src={`${API_BASE_URL}/images/${item.original_image_filename}`} alt="Original" className="gallery-item-thumb original"/>
                        </div>
                        <div className="gallery-item-info">
                            <div className="gallery-item-details">
                                <div className="gallery-item-tags">
                                    {item.tags_used?.slice(0, 3).join(', ') || 'General Concept'}
                                </div>
                                <div className="gallery-item-creator">
                                   by {item.creator_name || 'Anonymous'}
                                </div>
                            </div>
                            <button className="like-button" onClick={(e) => handleVoteClick(e, item.id)}>
                                👍 {item.votes}
                            </button>
                        </div>
                    </div>
                ))}
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



