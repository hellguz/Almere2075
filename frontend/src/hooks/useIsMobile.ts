import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * A custom hook that returns true if the screen width is within the mobile breakpoint.
 * @returns {boolean} True if the screen is considered mobile-sized.
 */
export const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};



