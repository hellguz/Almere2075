import React, { useMemo, useRef } from 'react';
import { useFrame, RootState } from '@react-three/fiber';
// MODIFIED: Removed the unused 'THREE' namespace import.
import { Vector2, Vector3, Texture, Group } from 'three';
import { GALLERY_CONFIG } from '../../config';

interface ImageNodeProps {
    texture: Texture;
    homePosition: [number, number, number];
    baseSize: number;
    onImageClick: (texture: Texture) => void;
    isInBackground: boolean;
}

const ImageNode: React.FC<ImageNodeProps> = ({ texture, homePosition, baseSize, onImageClick, isInBackground }) => {
    const meshRef = useRef<Group>(null);
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        // FIXED: Assert the return type as a tuple to satisfy the 'scale' prop's type.
        return [
            imageAspect > 1 ? baseSize : baseSize * imageAspect, 
            imageAspect > 1 ? baseSize / imageAspect : baseSize, 
            1
        ] as [number, number, number];
    }, [texture, baseSize]);

    useFrame((state: RootState) => {
        if (!meshRef.current) return;

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

        meshRef.current.position.lerp(new Vector3(targetPosition.x, targetPosition.y, targetZ), GALLERY_CONFIG.DAMPING);
        meshRef.current.scale.lerp(new Vector3(targetScale, targetScale, 1), GALLERY_CONFIG.DAMPING);
    });
    return (
        <group ref={meshRef} position={homePosition} onClick={() => onImageClick(texture)}>
             <mesh scale={imagePlaneScale}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
        </group>
    );
};

export default ImageNode;