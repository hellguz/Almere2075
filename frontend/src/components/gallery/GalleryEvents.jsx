import React from 'react';
import { useThree } from '@react-three/fiber';

const GalleryEvents = ({ handlePointerDown, handlePointerMove, handlePointerUp }) => {
    const { viewport, size } = useThree();
    const moveHandler = (e) => handlePointerMove(e, viewport, size);
    
    return (
        <group
            onPointerDown={handlePointerDown}
            onPointerMove={moveHandler}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
};

export default GalleryEvents;

