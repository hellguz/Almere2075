import React, { useMemo, useRef } from 'react';
import { useFrame, RootState } from '@react-three/fiber';
import { Vector2, Vector3, Group } from 'three';
import { Html } from '@react-three/drei';
import { GALLERY_CONFIG } from '../../config';
import type { GenerationDetails } from '../../types';
import GalleryItemCard from './GalleryItemCard';

interface CommunityCardNodeProps {
    item: GenerationDetails;
    homePosition: [number, number, number];
    baseSize: number;
    onItemSelect: (item: GenerationDetails) => void;
    onVote: (e: React.MouseEvent<HTMLButtonElement>, id: string) => void;
    isInBackground: boolean;
}

const CommunityCardNode: React.FC<CommunityCardNodeProps> = ({ item, homePosition, baseSize, onItemSelect, onVote, isInBackground }) => {
    const groupRef = useRef<Group>(null);
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    useFrame((state: RootState) => {
        if (!groupRef.current) return;

        let mousePos: Vector2;
        if (isInBackground) {
            const t = state.clock.getElapsedTime();
            const x = Math.sin(t * 0.2) * (state.viewport.width / 5);
            const y = Math.cos(t * 0.3) * (state.viewport.height / 5);
            mousePos = new Vector2(x, y);
        } else {
            mousePos = new Vector2(state.mouse.x * state.viewport.width / 2, state.mouse.y * state.viewport.height / 2);
        }
        
        const homePos2D = new Vector2(homeVec.x, homeVec.y);
        const directionVec = new Vector2().subVectors(homePos2D, mousePos);
        const dist = directionVec.length();
        
        const influenceRadius = GALLERY_CONFIG.FALLOFF_RADIUS;
        const normalizedDist = Math.min(dist / influenceRadius, 1.0);
        const distortedDist = Math.pow(normalizedDist, GALLERY_CONFIG.DISTORTION_POWER) * influenceRadius;
        const targetPosition = new Vector2().addVectors(mousePos, directionVec.normalize().multiplyScalar(distortedDist));
        
        if (dist > influenceRadius) {
            targetPosition.copy(homePos2D);
        }

        const proximity = 1 - normalizedDist;
        const targetScale = GALLERY_CONFIG.MIN_SCALE + Math.pow(proximity, GALLERY_CONFIG.SCALE_CURVE) * (GALLERY_CONFIG.MAX_SCALE - GALLERY_CONFIG.MIN_SCALE);
        const targetZ = proximity * GALLERY_CONFIG.Z_LIFT;

        groupRef.current.position.lerp(new Vector3(targetPosition.x, targetPosition.y, targetZ), GALLERY_CONFIG.DAMPING);
        groupRef.current.scale.lerp(new Vector3(targetScale, targetScale, 1), GALLERY_CONFIG.DAMPING);
    });

    const scalingDivisor = GALLERY_CONFIG.SCALE_CURVE;
    const htmlScale = baseSize / scalingDivisor;

    return (
        // FIXED: The onClick handler is now on the 3D group.
        <group ref={groupRef} position={homePosition} onClick={() => onItemSelect(item)}>
            <Html
                transform
                occlude
                // FIXED: This prop makes the HTML invisible to the mouse, allowing the
                // canvas underneath to receive hover events for the animation.
                pointerEvents="none"
                scale={htmlScale}
                position={[0, 0, 0.1]}
            >
                <GalleryItemCard item={item} onVote={onVote} />
            </Html>
        </group>
    );
};

export default CommunityCardNode;