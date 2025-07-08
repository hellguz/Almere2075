// Styles
import './App.css';
// Hooks and Store
import { useStore } from './store';
import { useIsMobile } from './hooks/useIsMobile';
import { useEffect } from 'react';

// UI Components
import LogPanel from './components/ui/LogPanel';
import GamificationWidget from './components/ui/GamificationWidget';
import ComparisonView from './components/ui/ComparisonView';
import TutorialModal from './components/ui/TutorialModal';
import DatasetToggle from './components/ui/DatasetToggle';

// Views
import GalleryView from './views/GalleryView';
import TransformView from './views/TransformView';
import CommunityGalleryView from './views/CommunityGalleryView';

/**
 * The main application component, which orchestrates the different views and UI elements.
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  const isMobile = useIsMobile();
  
  // Get all state and actions from the store
  const { state, actions } = useStore(state => ({ state: state, actions: state.actions }));
  const { view, dataset } = state;

  // Effect for fetching initial data on mount
  useEffect(() => {
    actions.fetchInitialData();
  }, [actions]);

  // Effect for fetching dataset-specific data when the dataset changes
  useEffect(() => {
    actions.fetchGalleryImages();
  }, [dataset, actions]);


  const showGalleryBackground = (view === 'transform' || view === 'comparison') && !state.isCommunityItem;
  const showBackButton = view !== 'gallery' && !state.modalItem;

  return (
    <div className="app-container">
      <header className="app-header">
          <div className="header-left">
             {showBackButton && (
                <button onClick={actions.handleBackToStart} className="back-button">
                  {isMobile ? '← BACK' : '← BACK TO START'}
                </button>
             )}
             {/* MODIFIED: Toggle is now here and only shows on the main gallery screen */}
             {view === 'gallery' && <DatasetToggle />}
          </div>
          <div className="header-center">
            <GamificationWidget />
          </div>
          <div className="header-right">
            {(view === 'gallery') && (
                <button className="community-gallery-button" onClick={() => actions.setState('view', 'community_gallery')}>COMMUNITY GALLERY</button>
            )}
          </div>
      </header>

      <main>
        <GalleryView 
            images={state.galleryImages} 
            isVisible={view === 'gallery' || showGalleryBackground}
            isInBackground={showGalleryBackground}
            onImageClick={actions.handleSelectGalleryImage}
            onNewImage={actions.startTransform}
            onShowTutorial={actions.handleShowTutorial}
        />
         <TransformView 
            sourceImage={state.sourceImageForTransform} 
            isVisible={view === 'transform'} 
            isProcessing={state.isProcessing}
            onTransform={actions.handleTransform}
            tags={state.availableTags}
            selectedTags={state.selectedTags}
            onTagToggle={actions.toggleTag}
         />
        <ComparisonView
            generationDetails={state.generationDetails}
            sourceImage={state.sourceImageForTransform}
            isVisible={view === 'comparison'}
            mode={state.comparisonMode}
            onModeChange={(mode) => actions.setState('comparisonMode', mode)}
            onSetName={actions.handleSetName}
            onHide={actions.handleHide}
         />
        <CommunityGalleryView
            isVisible={view === 'community_gallery'}
            items={state.communityGalleryItems}
            onVote={actions.handleVote}
            modalItem={state.modalItem}
            onItemSelect={actions.openModal}
            onModalClose={actions.closeModal}
            fetchGallery={actions.fetchCommunityGallery}
            dataset={dataset}
        />
      </main>
      
      <LogPanel messages={state.logMessages} isVisible={state.isProcessing} />
      
      <TutorialModal 
          isVisible={state.showTutorial} 
          onClose={actions.closeTutorial}
      />
    </div>
  );
}

export default App;

