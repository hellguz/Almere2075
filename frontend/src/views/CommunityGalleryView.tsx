import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import ComparisonView from '../components/ui/ComparisonView';
import type { GenerationDetails } from '../types';
import './CommunityGalleryView.css';

interface CommunityGalleryViewProps {
    isVisible: boolean;
    onVote: (id: string) => Promise<void>;
    onItemSelect: (item: GenerationDetails) => void;
    modalItem: GenerationDetails | null;
    onModalClose: () => void;
}

type ComparisonMode = 'slider' | 'side-by-side';

const CommunityGalleryView: React.FC<CommunityGalleryViewProps> = ({ isVisible, onVote, onItemSelect, modalItem, onModalClose }) => {
    const [items, setItems] = useState<GenerationDetails[]>([]);
    const [modalComparisonMode, setModalComparisonMode] = useState<ComparisonMode>('side-by-side');

    const fetchGallery = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/public-gallery`);
            if (!response.ok) throw new Error('Failed to fetch gallery');
            const data: GenerationDetails[] = await response.json();
            setItems(data);
        } catch (error) {
             console.error("Error fetching community gallery:", error);
        }
    }, []);

    useEffect(() => {
        if (isVisible && !modalItem) {
            fetchGallery();
        }
    }, [isVisible, modalItem, fetchGallery]);

    const handleVoteClick = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
        e.stopPropagation();
        onVote(itemId).then(() => {
            setItems(currentItems => currentItems.map(item => 
                item.id === itemId ? { ...item, votes: item.votes + 1 } : item
            ).sort((a, b) => b.votes - a.votes));
        }).catch(err => {
            alert((err as Error).message);
        });
    };
    
    const handleModalVote = useCallback(() => {
        if (!modalItem) return;

        const originalItem = { ...modalItem };
        const updatedItem = { ...modalItem, votes: modalItem.votes + 1 };
        
        onItemSelect(updatedItem);
        setItems(currentItems => currentItems.map(item => 
            item.id === modalItem.id ? updatedItem : item
        ).sort((a, b) => b.votes - a.votes));

        onVote(modalItem.id).catch(err => {
            alert(`Error recording vote: ${(err as Error).message}`);
            onItemSelect(originalItem);
            setItems(currentItems => currentItems.map(item =>
                item.id === modalItem.id ? originalItem : item
            ).sort((a, b) => b.votes - a.votes));
        });
    }, [modalItem, onVote, onItemSelect]);

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

