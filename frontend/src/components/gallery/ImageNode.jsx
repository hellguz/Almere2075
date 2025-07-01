import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, Vector3 } from 'three';
import { GALLERY_CONFIG } from '../../config';

// MODIFIED: Accept panOffset to synchronize animation and panning coordinates.
const ImageNode = ({ texture, homePosition, baseSize, onImageClick, panOffset }) => {
    const meshRef = useRef();
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        return [imageAspect > 1 ? baseSize : baseSize * imageAspect, imageAspect > 1 ? baseSize / imageAspect : baseSize, 1];
    }, [texture, baseSize]);

    useFrame(({ viewport, mouse }) => {
        if (!meshRef.current) return;

        // Mouse position in world units (relative to the viewport)
        const mouseWorld = new Vector2(mouse.x * viewport.width / 2, mouse.y * viewport.height / 2);

        // THE FIX: Adjust the mouse position by the pan offset to get its
        // position in the local coordinate system of the gallery group.
        const mouseLocal = new Vector2(mouseWorld.x - panOffset.x, mouseWorld.y - panOffset.y);

        // Node's home position (which is already local to the group)
        const homePos2D = new Vector2(homeVec.x, homeVec.y);

        // Now, all calculations are in the same local coordinate space.
        const directionVec = new Vector2().subVectors(homePos2D, mouseLocal);
        const dist = directionVec.length();
        
        const influenceRadius = GALLERY_CONFIG.FALLOFF_RADIUS;
        const normalizedDist = Math.min(dist / influenceRadius, 1.0);

        // Use the local mouse coordinates for the fisheye effect calculation.
        const distortedDist = Math.pow(normalizedDist, GALLERY_CONFIG.DISTORTION_POWER) * influenceRadius;
        const targetPosition = new Vector2().addVectors(mouseLocal, directionVec.normalize().multiplyScalar(distortedDist));
        
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

