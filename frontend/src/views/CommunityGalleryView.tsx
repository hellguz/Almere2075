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
 * @property {'weimar' | 'almere'} dataset - The current dataset.
 * @property {() => void} [onHide] - Callback to hide the generation from the gallery.
 */
interface CommunityGalleryViewProps {
    isVisible: boolean;
    items: GenerationDetails[];
    modalItem: GenerationDetails | null;
    onVote: (id: string) => Promise<void>;
    onItemSelect: (item: GenerationDetails) => void;
    onModalClose: () => void;
    onHide?: () => void; // ADDED: onHide is now an optional prop
    fetchGallery: () => void;
    dataset: 'weimar' | 'almere';
}

type ComparisonMode = 'slider' | 'side-by-side';
/**
 * Renders the community gallery grid and the modal for viewing individual items.
 * @param {CommunityGalleryViewProps} props The component props.
 * @returns {JSX.Element} The rendered component.
 */
const CommunityGalleryView: React.FC<CommunityGalleryViewProps> = ({
    isVisible,
    items,
    modalItem,
    onVote,
    onItemSelect,
    onModalClose,
    onHide, // ADDED
    fetchGallery,
    dataset,
}) => {
    const [modalComparisonMode, setModalComparisonMode] = useState<ComparisonMode>('side-by-side');
    const modalRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);

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
    }, [isVisible, modalItem, fetchGallery, dataset]);
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
    const handleVoteClick = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
        e.stopPropagation();
        onVote(itemId);
    };
    const handleModalVote = useCallback(() => {
        if (!modalItem) return;
        onVote(modalItem.id);
    }, [modalItem, onVote]);
    /**
     * Handles clicks on the modal overlay.
     * Closes the modal only if the click
     * is on the overlay itself, not on its children.
     * @param {React.MouseEvent<HTMLDivElement>} e The mouse event.
     */
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onModalClose();
        }
    };

    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`} ref={viewRef}>
            <div className="gallery-info-text">
                <p>Explore visions of Almere 2075 from the <b>{dataset.toUpperCase()}</b> dataset. <b>Give a "👍" to your favorites</b> to help the city reach its happiness goal!</p>
            </div>
            <div className="gallery-grid-container">
                 {items.map(item => {
                    const solutionThumbUrl = item.generated_image_thumb_url
                        ? `${API_BASE_URL}/thumbnails/${item.generated_image_thumb_url}`
                        : (item.generated_image_url ? `${API_BASE_URL}/${item.generated_image_url}` : '');
                    const threatThumbUrl = item.threat_image_thumb_url
                        ? `${API_BASE_URL}/thumbnails/${item.threat_image_thumb_url}`
                        : (item.threat_image_url ? `${API_BASE_URL}/${item.threat_image_url}` : '');

                    return (
                         <div key={item.id} className="gallery-item" onClick={() => onItemSelect(item)}>
                            <div className="gallery-item-images">
                                {solutionThumbUrl && <img src={solutionThumbUrl} alt="Solution" className="gallery-item-thumb generated"/>}
                                 <img src={threatThumbUrl || solutionThumbUrl} alt="Threat" className="gallery-item-thumb original"/>
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
                    );
                })}
            </div>

            {modalItem && (
                 <div className="modal-overlay" onClick={handleOverlayClick} ref={modalRef}>
                    <div className="modal-content">
                        <div className="modal-header">
                             <button className="modal-close-button" onClick={onModalClose}>← CLOSE</button>
                            <div className="view-mode-toggle">
                                <button className={modalComparisonMode === 'side-by-side' ? 'active' : ''} onClick={() => setModalComparisonMode('side-by-side')}>3-Way</button>
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
                            onHide={onHide} // Pass down onHide to ComparisonView
                        />
                    </div>
                </div>
             )}
        </div>
    );
};

export default CommunityGalleryView;
