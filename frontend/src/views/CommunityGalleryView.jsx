import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import ComparisonView from '../components/ui/ComparisonView';
import './CommunityGalleryView.css';

const CommunityGalleryView = ({ isVisible, onVote, onItemSelect, modalItem, onModalClose }) => {
    const [items, setItems] = useState([]);
    const [modalComparisonMode, setModalComparisonMode] = useState('side-by-side');

    const fetchGallery = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/public-gallery`);
            if (!response.ok) throw new Error('Failed to fetch gallery');
            const data = await response.json();
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

    const handleVoteClick = (e, itemId) => {
        e.stopPropagation();
        onVote(itemId).then(() => {
            setItems(currentItems => currentItems.map(item => 
                item.id === itemId ? { ...item, votes: item.votes + 1 } : item
            ).sort((a, b) => b.votes - a.votes)); // Re-sort after voting
        }).catch(err => {
            alert(err.message);
        });
    };
    
    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`}>
            <div className="gallery-info-text">
                <p>Explore visions of Almere 2075 created by others. <b>Give a "👍" to your favorites</b> to help the city reach its happiness goal!</p>
            </div>
            <div className="gallery-grid-container">
                {items.map(item => (
                    <div key={item.id} className="gallery-item" onClick={() => onItemSelect(item)}>
                        <div className="gallery-item-images">
                            <img src={`${API_BASE_URL}/thumbnails/${item.original_image_filename.replace(/\.[^/.]+$/, ".jpeg")}`} alt="Original" className="gallery-item-thumb original"/>
                            <img src={item.generated_image_url} alt="Generated" className="gallery-item-thumb generated"/>
                        </div>
                        <div className="gallery-item-info">
                            <div className="gallery-item-tags">
                                {item.tags_used?.slice(0, 3).join(', ') || 'General Concept'}
                            </div>
                            <div className="gallery-item-creator">
                                by {item.creator_name || 'Anonymous'}
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
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityGalleryView;

