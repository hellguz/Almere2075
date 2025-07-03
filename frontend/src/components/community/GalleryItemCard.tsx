import React from 'react';
import type { GenerationDetails } from '../../types';
import { API_BASE_URL } from '../../config';
import './GalleryItemCard.css';

interface GalleryItemCardProps {
    item: GenerationDetails;
    onVote: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
}

const GalleryItemCard: React.FC<GalleryItemCardProps> = ({ item, onVote }) => {

    const handleVoteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // This stops the click from bubbling up to the parent group's onClick handler.
        e.stopPropagation();
        onVote(e, item.id);
    };

    return (
        // The onClick handler was removed from this div; the parent group now handles it.
        <div className="gallery-item-card">
            <div className="gallery-item-images">
                {item.generated_image_url && (
                    <img
                        src={`${API_BASE_URL}/images/${item.generated_image_url}`}
                        alt="Generated"
                        className="gallery-item-thumb generated"
                    />
                )}
                <img
                    src={`${API_BASE_URL}/images/${item.original_image_filename}`}
                    alt="Original"
                    className="gallery-item-thumb original"
                />
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
                {/* This button uses the specific handler with stopPropagation to function correctly. */}
                <button className="like-button" onClick={handleVoteClick}>
                    👍 {item.votes}
                </button>
            </div>
        </div>
    );
};

export default GalleryItemCard;

