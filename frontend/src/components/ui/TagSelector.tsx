import React from 'react';
import type { Tag } from '../../types';

interface TagSelectorProps {
    title: string;
    tags: Tag[];
    selectedTags: string[];
    onTagToggle: (tagId: string) => void;
    singleSelection?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({ title, tags, selectedTags, onTagToggle, singleSelection = false }) => {
    if (!tags.length) return null;

    const handleToggle = (tagId: string) => {
        onTagToggle(tagId);
    };

    return (
        <div className="tag-selector-container">
            <p className="transform-step-title">{title}</p>
            <div className="tag-list-wrapper">
                <div className="tag-list">
                    {tags.map(tag => (
                         <button
                            key={tag.id}
                            className={`tag-button ${selectedTags.includes(tag.id) ? 'active' : ''} ${singleSelection && !selectedTags.includes(tag.id) ? 'single-select' : ''}`}
                            onClick={() => handleToggle(tag.id)}
                            title={tag.description}
                        >
                            {tag.name}
                         </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagSelector;