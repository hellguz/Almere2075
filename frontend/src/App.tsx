// Styles
import './App.css';
// Hooks and Store
import { useStore } from './store';
import { useIsMobile } from './hooks/useIsMobile';
import React, { useEffect, useState } from 'react';

// UI Components
import LogPanel from './components/ui/LogPanel';
import GamificationWidget from './components/ui/GamificationWidget';
import ComparisonView from './components/ui/ComparisonView';
import TutorialModal from './components/ui/TutorialModal';
import DatasetToggle from './components/ui/DatasetToggle';
import NewsTicker from './components/ui/NewsTicker';
import { tickerConfig } from './tickerConfig';

// Views
import GalleryView from './views/GalleryView';
import TransformView from './views/TransformView';
import CommunityGalleryView from './views/CommunityGalleryView';
import SlideshowView from './views/SlideshowView';

/**
 * The main application component, which orchestrates the different views and UI elements.
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  const isMobile = useIsMobile();
  // Get all state and actions from the store
  const { state, actions } = useStore(state => ({ state: state, actions: state.actions }));
  const { view, dataset } = state;

  // NEW: Add routing logic for the slideshow
  const [isSlideshow] = useState(window.location.pathname === '/slides');
  // Effect for fetching initial data on mount
  useEffect(() => {
    // Don't fetch interactive-app data if we are in slideshow mode
    if (isSlideshow) return;
    actions.fetchInitialData();
  }, [actions, isSlideshow]);
  // Effect for fetching dataset-specific data when the dataset changes
  useEffect(() => {
    // Don't fetch interactive-app data if we are in slideshow mode
    if (isSlideshow) return;
    actions.fetchGalleryImages();
  }, [dataset, actions, isSlideshow]);

  if (isSlideshow) {
    return <SlideshowView />;
  }

  // MODIFIED: This style now sets CSS variables for both top and bottom offsets.
  const appWrapperStyle = {
    '--bottom-offset': tickerConfig.showBottomTicker ? tickerConfig.tickerHeight : '0px',
    '--top-offset': tickerConfig.showTopTicker ? tickerConfig.tickerHeight : '0px',
    display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#000'
  } as React.CSSProperties;

  const showGalleryBackground = (view === 'transform' || view === 'comparison') && !state.isCommunityItem;
  const showBackButton = view !== 'gallery' && !state.modalItem;

  return (
    <div style={appWrapperStyle}>
      {tickerConfig.showTopTicker && <NewsTicker position="top" />}
      <div className="app-container">
        <header className="app-header">
            <div className="header-left">
               {showBackButton && (
                  <button onClick={actions.handleBackToStart} className="back-button">
                    {isMobile ? '← BACK' : '← BACK TO START'}
                  </button>
               )}
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
              threatImage={state.threatImageForTransform}
              isVisible={view === 'transform'} 
              isProcessing={state.isProcessing}
              transformStep={state.transformStep}
              onGenerateThreat={actions.handleGenerateThreat}
              onGenerateSolution={actions.handleGenerateSolution}
              availableThreatTags={state.availableThreatTags}
              selectedThreatTag={state.selectedThreatTag}
              onThreatTagSelect={actions.selectThreatTag}
              availableSolutionTags={state.availableSolutionTags}
              selectedSolutionTags={state.selectedSolutionTags}
              onSolutionTagToggle={actions.toggleSolutionTag}
           />
           <ComparisonView
              generationDetails={state.generationDetails}
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
      {tickerConfig.showBottomTicker && <NewsTicker position="bottom" />}
    </div>
  );
}

export default App;
