import React from 'react';
import './LogoPanel.css';

/**
 * A simple component to display logos in the corner of the screen.
 * @returns {JSX.Element} The rendered LogoPanel component.
 */
const LogoPanel: React.FC = () => {
    return (
        <div className="logo-panel-container">
            <img src="/uni-logo.png" alt="University Logo" />
            <img src="/infau-logo.svg" alt="InfAU Logo" />
        </div>
    );
};

export default LogoPanel;
