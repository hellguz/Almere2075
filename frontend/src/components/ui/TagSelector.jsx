import React from 'react';

const TagSelector = ({ tags, selectedTags, onTagToggle }) => {
    if (!tags.length) return null;

    return (
        <div className="tag-selector-container">
            <p className="tag-selector-title">2. Choose concepts (or leave blank for random)</p>
            <div className="tag-list-wrapper">
                <div className="tag-list">
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            className={`tag-button ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                            onClick={() => onTagToggle(tag.id)}
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

