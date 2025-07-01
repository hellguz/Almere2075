import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, Vector3 } from 'three';
import { GALLERY_CONFIG } from '../../config';

// MODIFIED: Simplified to remove panOffset. The animation is now driven
// directly by the mouse/touch position over the static grid.
const ImageNode = ({ texture, homePosition, baseSize, onImageClick }) => {
    const meshRef = useRef();
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        return [imageAspect > 1 ? baseSize : baseSize * imageAspect, imageAspect > 1 ? baseSize / imageAspect : baseSize, 1];
    }, [texture, baseSize]);

    useFrame(({ viewport, mouse }) => {
        if (!meshRef.current) return;

        // The mouse position in world units is all we need now.
        const mousePos = new Vector2(mouse.x * viewport.width / 2, mouse.y * viewport.height / 2);

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

