import React, { useEffect, useRef } from 'react';
import './QRCodeModal.css';

// Let TypeScript know that QRCode is available globally from the script tag
declare const QRCode: any;

/**
 * @typedef {object} QRCodeModalProps
 * @property {boolean} isVisible - Whether the modal is currently visible.
 * @property {() => void} onClose - Callback function to close the modal.
 * @property {string} url - The URL to encode in the QR code.
 */
interface QRCodeModalProps {
    isVisible: boolean;
    onClose: () => void;
    url: string;
}

/**
 * A modal component that displays a QR code for a given URL.
 * @param {QRCodeModalProps} props The component props.
 * @returns {JSX.Element | null} The rendered QRCodeModal component or null.
 */
const QRCodeModal: React.FC<QRCodeModalProps> = ({ isVisible, onClose, url }) => {
    const qrCodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Generate QR code only when the modal becomes visible
        if (isVisible && qrCodeRef.current && typeof QRCode !== 'undefined') {
            qrCodeRef.current.innerHTML = ''; // Clear previous QR code
            new QRCode(qrCodeRef.current, {
                text: url,
                width: 256,
                height: 256,
                colorDark: '#ffffff',
                colorLight: '#1c1c1e',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, [isVisible, url]);

    if (!isVisible) return null;

    return (
        <div className="qr-modal-overlay visible" onClick={onClose}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Upload from your Phone</h2>
                <p>Scan this QR code with your phone's camera to open the upload page. The image will appear in the gallery here automatically.</p>
                <div ref={qrCodeRef} className="qr-code-container"></div>
                <button onClick={onClose} className="qr-modal-close-button">CLOSE</button>
            </div>
        </div>
    );
};

export default QRCodeModal;
