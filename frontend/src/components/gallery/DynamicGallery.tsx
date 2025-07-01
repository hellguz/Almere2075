import React, { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { TextureLoader, Vector2, Texture } from 'three';
import { API_BASE_URL, GALLERY_CONFIG } from '../../config';
import ImageNode from './ImageNode';
import type { GalleryImage } from '../../types';

interface DynamicGalleryProps {
    images: GalleryImage[];
    onImageClick: (texture: Texture) => void;
    isInBackground: boolean;
}

const DynamicGallery: React.FC<DynamicGalleryProps> = ({ images, onImageClick, isInBackground }) => {
    const textures = useLoader(TextureLoader, images.map(img => `${API_BASE_URL}/thumbnails/${img.thumbnail}`));
    const { viewport } = useThree();

    const grid = useMemo(() => {
        if (!textures.length || viewport.width === 0) return [];
        
        const imageCount = images.length;
        const { width, height } = viewport;
        const items = [];
        const tempPoints: Vector2[] = [];
        const hexSize = Math.sqrt((width * height) / (imageCount * 1.5 * Math.sqrt(3))) / GALLERY_CONFIG.GRID_DENSITY;
        const hexWidth = Math.sqrt(3) * hexSize;
        const hexHeight = 2 * hexSize;
        const cols = Math.ceil(width / hexWidth);
        const rows = Math.ceil(height / (hexHeight * 0.75));

        for (let row = 0; row < rows + 2; row++) {
            for (let col = 0; col < cols + 2; col++) {
                tempPoints.push(new Vector2(
                    col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0),
                    row * hexHeight * 0.75
                ));
            }
         }
        const center = tempPoints.slice(0, imageCount).reduce((acc, p) => acc.add(p), new Vector2(0,0)).multiplyScalar(1 / imageCount);
        for (let i = 0; i < imageCount; i++) {
            const point = tempPoints[i];
            items.push({
                index: i,
                texture: textures[i],
                homePosition: [point.x - center.x, point.y - center.y, 0] as [number, number, number],
                baseSize: (hexWidth / Math.sqrt(3)) * 1.1,
            });
        }
        return items;
    }, [images, textures, viewport.width, viewport.height]);
    return (
        <group>
            {grid.map(item => (
                <ImageNode
                    key={item.index}
                    {...item}
                    onImageClick={onImageClick}
                    isInBackground={isInBackground}
                />
            ))}
        </group>
    );
};

export default DynamicGallery;

