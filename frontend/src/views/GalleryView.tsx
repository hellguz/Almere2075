import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { fileToDataUrl } from '../utils';
import DynamicGallery from '../components/gallery/DynamicGallery';
import type { GalleryImage, SourceImage } from '../types';
import type { Texture } from 'three';
import './GalleryView.css';

interface GalleryViewProps {
    images: GalleryImage[];
    isVisible: boolean;
    isInBackground: boolean;
    onImageClick: (texture: Texture) => void;
    onNewImage: (source: SourceImage) => void;
    onShowTutorial: () => void;
}

const GalleryView: React.FC<GalleryViewProps> = ({ images, isVisible, isInBackground, onImageClick, onNewImage, onShowTutorial }) => {
    const viewRef = useRef<HTMLDivElement>(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // FIXED: The event handlers are on the Canvas's outer div, not the inner canvas element.
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        panState.current.isPanning = true;
        panState.current.hasDragged = false;
        panState.current.startCoords = { x: e.clientX, y: e.clientY };
    };
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!panState.current.isPanning) return;
        
        const dx = e.clientX - panState.current.startCoords.x;
        const dy = e.clientY - panState.current.startCoords.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            panState.current.hasDragged = true;
        }
    };

    const handlePointerUp = () => {
        panState.current.isPanning = false;
    };

    const handleImageClick = (texture: Texture) => {
        if (!panState.current.hasDragged) {
            onImageClick(texture);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) {
                alert("File is too large. Please select an image smaller than 15MB.");
                return;
            }
            const url = await fileToDataUrl(file);
            onNewImage({ url, name: file.name });
        }
        e.target.value = '';
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