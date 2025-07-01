import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { fileToDataUrl } from '../utils';
import DynamicGallery from '../components/gallery/DynamicGallery';
import './GalleryView.css';

// This new component handles the frame-by-frame updates for panning,
// which prevents conflicts with React's render cycle.
const GalleryPanController = ({ galleryRef, panOffset }) => {
    useFrame(() => {
        if (galleryRef.current) {
            // Smoothly interpolate the gallery group's position towards the target pan offset
            galleryRef.current.position.x = panOffset.current.x;
            galleryRef.current.position.y = panOffset.current.y;
        }
    });
    return null; // This component does not render anything visible
};

const GalleryView = ({ images, isVisible, isInBackground, onImageClick, onNewImage, onShowTutorial }) => {
    const [showInstructions, setShowInstructions] = useState(true);
    const fileInputRef = useRef(null);
    const galleryGroupRef = useRef(); // A ref for the pannable group

    // Refs to manage interaction state without causing re-renders
    const panState = useRef({ isPanning: false, startCoords: { x: 0, y: 0 }, hasDragged: false });
    const panOffset = useRef({ x: 0, y: 0 });
    const lastPanOffset = useRef({ x: 0, y: 0 });

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
        lastPanOffset.current = { ...panOffset.current };
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
        
        // Convert screen pixel delta to world unit delta
        const { width, height } = e.target.getBoundingClientRect();
        const viewport = { width: galleryGroupRef.current.parent.viewport.width, height: galleryGroupRef.current.parent.viewport.height };
        const dx_world = dx * (viewport.width / width);
        const dy_world = dy * (viewport.height / height);

        panOffset.current = {
            x: lastPanOffset.current.x + dx_world,
            y: lastPanOffset.current.y - dy_world,
        };
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
        <div className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${isInBackground ? 'in-background' : ''}`}>
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
                <GalleryPanController galleryRef={galleryGroupRef} panOffset={panOffset} />
                {images.length > 0 && 
                    <DynamicGallery 
                        ref={galleryGroupRef} 
                        images={images} 
                        onImageClick={handleImageClick}
                        panOffset={panOffset}
                    />
                }
            </Canvas>
        </div>
    );
};

export default GalleryView;

