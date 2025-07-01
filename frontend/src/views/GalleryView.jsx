import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { fileToDataUrl } from '../utils';
import DynamicGallery from '../components/gallery/DynamicGallery';
import './GalleryView.css';

const GalleryView = ({ images, isVisible, isInBackground, onImageClick, onNewImage, onShowTutorial }) => {
    // MODIFIED: Create a ref for the main container
    const viewRef = useRef(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const fileInputRef = useRef(null);

    // MODIFIED: This effect dynamically sets the view height to handle the mobile browser's
    // address bar, ensuring the buttons at the bottom are always visible.
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

    const panState = useRef({ isPanning: false, startCoords: { x: 0, y: 0 }, hasDragged: false });
    
    useEffect(() => {
        const handleInteraction = () => setShowInstructions(false);
        window.addEventListener('mousemove', handleInteraction, { once: true });
        window.addEventListener('click', handleInteraction, { once: true });
        const timer = setTimeout(() => setShowInstructions(false), 5000);
        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('click', handleInteraction);
            clearTimeout(timer);
        };
    }, []);

    const handlePointerDown = (e) => {
        panState.current.isPanning = true;
        panState.current.hasDragged = false;
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        const y = e.clientY ?? e.touches?.[0]?.clientY;
        panState.current.startCoords = { x, y };
    };
    const handlePointerMove = (e) => {
        if (!panState.current.isPanning) return;
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        const y = e.clientY ?? e.touches?.[0]?.clientY;
        
        const dx = x - panState.current.startCoords.x;
        const dy = y - panState.current.startCoords.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            panState.current.hasDragged = true;
        }
    };

    const handlePointerUp = () => {
        panState.current.isPanning = false;
    };

    const handleImageClick = (texture) => {
        if (!panState.current.hasDragged) {
            onImageClick(texture);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) {
                alert("File is too large. Please select an image smaller than 15MB.");
                return;
            }
            const url = await fileToDataUrl(file);
            onNewImage({ url, name: file.name });
        }
        e.target.value = null;
    };
    return (
        <div ref={viewRef} className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${isInBackground ? 'in-background' : ''}`}>
            {!isInBackground && (
                <>
                    <div className={`gallery-instructions ${!showInstructions ? 'fade-out' : ''}`}>
                        DRAG TO EXPLORE. TAP AN IMAGE TO BEGIN.
                    </div>
                    <div className="main-actions-container">
                        <button className="upload-button" onClick={onShowTutorial}>HOW IT WORKS</button>
                        <button className="upload-button" onClick={() => fileInputRef.current?.click()}>...OR UPLOAD YOUR OWN IMAGE</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}/>
                </>
            )}
            <Canvas 
                orthographic camera={{ position: [0, 0, 10], zoom: 100 }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <ambientLight intensity={3} />
                {images.length > 0 && 
                    <DynamicGallery 
                        images={images} 
                        onImageClick={handleImageClick}
                        isInBackground={isInBackground}
                    />
                }
            </Canvas>
        </div>
    );
};

export default GalleryView;