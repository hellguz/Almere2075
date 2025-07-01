import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { fileToDataUrl } from '../utils';
import DynamicGallery from '../components/gallery/DynamicGallery';
import GalleryEvents from '../components/gallery/GalleryEvents';

const GalleryView = ({ images, isVisible, isInBackground, onImageClick, onNewImage }) => {
    const [showInstructions, setShowInstructions] = useState(true);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panState = useRef({ isPanning: false, startCoords: { x: 0, y: 0 }, lastOffset: { x: 0, y: 0 } });
    const fileInputRef = useRef(null);
    
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
        if (e.pointerType === 'touch') {
            if (!isTouchDevice) setIsTouchDevice(true);
            const x = e.nativeEvent.touches?.[0]?.clientX ?? e.clientX;
            const y = e.nativeEvent.touches?.[0]?.clientY ?? e.clientY;
            panState.current.isPanning = true;
            panState.current.startCoords = { x, y };
            panState.current.lastOffset = panOffset;
        }
    };

    const handlePointerMove = (e, viewport, size) => {
        if (panState.current.isPanning) {
            const x = e.nativeEvent.touches?.[0]?.clientX ?? e.clientX;
            const y = e.nativeEvent.touches?.[0]?.clientY ?? e.clientY;
            if (x === undefined || y === undefined || panState.current.startCoords.x === undefined) return;
            const dx = (x - panState.current.startCoords.x) * (viewport.width / size.width);
            const dy = (y - panState.current.startCoords.y) * (viewport.height / size.height);
            setPanOffset({ x: panState.current.lastOffset.x + dx, y: panState.current.lastOffset.y - dy });
        }
    };

    const handlePointerUp = () => { if (panState.current.isPanning) { panState.current.isPanning = false; } };
    const handleClick = (texture) => { if (!panState.current.isPanning) { onImageClick(texture); } };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) { // 15MB limit
                alert("File is too large. Please select an image smaller than 15MB.");
                return;
            }
            const url = await fileToDataUrl(file);
            onNewImage({ url, name: file.name });
        }
        e.target.value = null; // Reset file input
    };

    return (
        <div className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${isInBackground ? 'in-background' : ''}`}>
            {!isInBackground && (
                <>
                    <div className={`gallery-instructions ${!showInstructions ? 'fade-out' : ''}`}>
                        {isTouchDevice ? 'DRAG TO EXPLORE. TAP AN IMAGE TO BEGIN.' : 'FOCUS TO EXPLORE. CLICK AN IMAGE TO BEGIN.'}
                    </div>
                    <div className="main-actions-container">
                        <button className="upload-button" onClick={() => fileInputRef.current?.click()}>... OR UPLOAD YOUR OWN IMAGE</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}/>
                </>
            )}
            <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 100 }}>
                 <ambientLight intensity={3} />
                {images.length > 0 && <DynamicGallery images={images} onImageClick={handleClick} isTouch={isTouchDevice} panOffset={panOffset} />}
                <GalleryEvents handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp} />
            </Canvas>
        </div>
    );
};

export default GalleryView;

