import React, { useEffect, useCallback, useState } from 'react';
import ComparisonView from '../components/ui/ComparisonView';
import type { GenerationDetails } from '../types';
import { API_BASE_URL } from '../config';
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

    useEffect(() => {
        if (isVisible && !modalItem) {
            fetchGallery();
        }
    }, [isVisible, modalItem, fetchGallery]);

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
                 <div className="modal-overlay" onClick={onModalClose}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                         <div className="modal-header">
                            <div className="view-mode-toggle">
                                <button className={modalComparisonMode === 'side-by-side' ? 'active' : ''} onClick={() => setModalComparisonMode('side-by-side')}>Side-by-Side</button>
                                 <button className={modalComparisonMode === 'slider' ? 'active' : ''} onClick={() => setModalComparisonMode('slider')}>Slider</button>
                            </div>
                             <button className="close-modal-button" onClick={onModalClose}>×</button>
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