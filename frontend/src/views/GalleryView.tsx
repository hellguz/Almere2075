import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { fileToDataUrl } from '../utils';
import DynamicGallery from '../components/gallery/DynamicGallery';
import QRCodeModal from '../components/ui/QRCodeModal';
import type { GalleryImage, SourceImage } from '../types';
import type { Texture } from 'three';
import './GalleryView.css';
import { useStore } from '../store';
import { API_BASE_URL } from '../config';

/**
 * @typedef {object} GalleryViewProps
 * @property {GalleryImage[]} images - The list of gallery images to display.
 * @property {boolean} isVisible - Whether the view is currently visible.
 * @property {boolean} isInBackground - Whether the view is currently in the background.
 * @property {(texture: Texture) => void} onImageClick - Callback function for when an image is clicked.
 * @property {(source: SourceImage) => void} onNewImage - Callback function for when a new image is uploaded.
 * @property {() => void} onShowTutorial - Callback function to show the tutorial.
 */
interface GalleryViewProps {
    images: GalleryImage[];
    isVisible: boolean;
    isInBackground: boolean;
    onImageClick: (texture: Texture) => void;
    onNewImage: (source: SourceImage) => void;
    onShowTutorial: () => void;
}

/**
 * The main view for browsing and selecting images from a dynamic 3D grid.
 * @param {GalleryViewProps} props The component props.
 * @returns {JSX.Element} The rendered GalleryView component.
 */
const GalleryView: React.FC<GalleryViewProps> = ({ images, isVisible, isInBackground, onImageClick, onNewImage, onShowTutorial }) => {
    const viewRef = useRef<HTMLDivElement>(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isQrModalVisible, setQrModalVisible] = useState(false);

    const { dataset, actions } = useStore(state => ({
        dataset: state.dataset,
        actions: state.actions,
    }));
    
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

    useEffect(() => {
        if (isVisible && !isInBackground) {
            const intervalId = setInterval(() => {
                actions.fetchGalleryImages();
            }, 5000);

            return () => clearInterval(intervalId);
        }
    }, [isVisible, isInBackground, actions]);

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
                         Welcome to the Almere 2075 AI Exhibition. Select a starting image, or upload your own, to begin.
                    </div>
                    <div className="main-actions-container">
                        <button className="upload-button" onClick={onShowTutorial}>❓HOW IT WORKS</button>
                        <button className="upload-button" onClick={() => setQrModalVisible(true)}>
                            📱 UPLOAD FROM PHONE
                        </button>
                        <button className="upload-button" onClick={() => fileInputRef.current?.click()}>⬆️ UPLOAD FROM THIS DEVICE</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: 'none' }}/>
                </>
            )}
            <QRCodeModal
                isVisible={isQrModalVisible}
                onClose={() => setQrModalVisible(false)}
                url={`${window.location.origin}/upload-mobile?dataset=${dataset}`}
            />
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
