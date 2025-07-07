import React from 'react';
import { useStore } from '../../store';
import './DatasetToggle.css';

/**
 * A component that allows the user to switch between the 'Weimar' and 'Almere' datasets.
 * It reads and updates the global state directly from the Zustand store.
 * @returns {JSX.Element} The rendered DatasetToggle component.
 */
const DatasetToggle: React.FC = () => {
    const { dataset, setDataset } = useStore(state => ({
        dataset: state.dataset,
        setDataset: state.actions.setDataset,
    }));

    return (
        <div className="dataset-toggle" title="Switch between image datasets">
            <button
                className={dataset === 'weimar' ? 'active' : ''}
                onClick={() => setDataset('weimar')}
            >
                WEIMAR
            </button>
            <button
                className={dataset === 'almere' ? 'active' : ''}
                onClick={() => setDataset('almere')}
            >
                ALMERE
            </button>
        </div>
    );
};

export default DatasetToggle;

