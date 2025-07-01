import React from 'react';

// Hooks
import { useAppLogic } from './hooks/useAppLogic';

// State & Components
import { setState } from './state';
import LogPanel from './components/ui/LogPanel';
import GamificationWidget from './components/ui/GamificationWidget';
import ComparisonView from './components/ui/ComparisonView';

// Views
import GalleryView from './views/GalleryView';
import TransformView from './views/TransformView';
import CommunityGalleryView from './views/CommunityGalleryView';

function App() {
  const {
    appState,
    galleryImages,
    availableTags,
    selectedTags,
    modalItem,
    handlers
  } = useAppLogic();

  const showGalleryBackground = (appState.view === 'transform' || appState.view === 'comparison') && !appState.isCommunityItem;

  return (
    <div className="app-container">
      <header className="app-header">
          <div className="header-left">
             {(appState.view !== 'gallery') && (
                <button onClick={handlers.handleBackToStart} className="back-button">← BACK TO START</button>
             )}
          </div>
          <div className="header-center">
            <GamificationWidget />
          </div>
          <div className="header-right">
            {(appState.view === 'gallery') && (
                <button className="community-gallery-button" onClick={() => setState('view', 'community_gallery')}>COMMUNITY GALLERY</button>
            )}
          </div>
      </header>

      <main>
        <GalleryView 
            images={galleryImages} 
            isVisible={appState.view === 'gallery' || showGalleryBackground} 
            isInBackground={showGalleryBackground}
            onImageClick={handlers.handleSelectGalleryImage}
            onNewImage={handlers.handleStartTransform}
        />
        <TransformView 
            sourceImage={appState.sourceImageForTransform} 
            isVisible={appState.view === 'transform'} 
            isProcessing={appState.isProcessing}
            onTransform={handlers.handleTransform}
            tags={availableTags}
            selectedTags={selectedTags}
            onTagToggle={handlers.handleTagToggle}
        />
        {/* The main comparison view after a transformation */}
        <ComparisonView
            generationDetails={appState.generationDetails}
            sourceImage={appState.sourceImageForTransform}
            isVisible={appState.view === 'comparison'}
            mode={appState.comparisonMode}
            onModeChange={(mode) => setState('comparisonMode', mode)}
            onSetName={handlers.handleSetName}
            onHide={handlers.handleHide}
        />
        <CommunityGalleryView
            isVisible={appState.view === 'community_gallery'}
            onVote={handlers.handleVote}
            modalItem={modalItem}
            onItemSelect={handlers.handleModalOpen}
            onModalClose={handlers.handleModalClose}
        />
      </main>
      
      <LogPanel messages={appState.logMessages} isVisible={appState.isProcessing} />
    </div>
  );
}

export default App;

