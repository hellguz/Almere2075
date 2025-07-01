// MODIFIED: 'React' import is no longer needed with the new JSX transform.
// import React from 'react';

// Styles
import './App.css';

// Hooks and Store
import { useAppLogic } from './hooks/useAppLogic';
import { useStore } from './store';

// UI Components
import LogPanel from './components/ui/LogPanel';
import GamificationWidget from './components/ui/GamificationWidget';
import ComparisonView from './components/ui/ComparisonView';
import TutorialModal from './components/ui/TutorialModal';

// Views
import GalleryView from './views/GalleryView';
import TransformView from './views/TransformView';
import CommunityGalleryView from './views/CommunityGalleryView';

function App() {
  // useAppLogic handles the application's side effects and async logic.
  const { handlers } = useAppLogic();
  
  // We get the reactive state directly from the Zustand store.
  const {
    view,
    isProcessing,
    logMessages,
    showTutorial,
    isCommunityItem,
    galleryImages,
    sourceImageForTransform,
    availableTags,
    selectedTags,
    comparisonMode,
    generationDetails,
    modalItem,
    communityGalleryItems
  } = useStore();

  const showGalleryBackground = (view === 'transform' || view === 'comparison') && !isCommunityItem;

  return (
    <div className="app-container">
      <header className="app-header">
          <div className="header-left">
             {(view !== 'gallery') && (
                <button onClick={handlers.handleBackToStart} className="back-button">← BACK TO START</button>
             )}
          </div>
          <div className="header-center">
            <GamificationWidget />
          </div>
          <div className="header-right">
            {(view === 'gallery') && (
                <button className="community-gallery-button" onClick={() => handlers.setState('view', 'community_gallery')}>COMMUNITY GALLERY</button>
            )}
          </div>
      </header>

      <main>
        <GalleryView 
            images={galleryImages} 
            isVisible={view === 'gallery' || showGalleryBackground} 
            isInBackground={showGalleryBackground}
            onImageClick={handlers.handleSelectGalleryImage}
            onNewImage={handlers.handleStartTransform}
            onShowTutorial={handlers.handleShowTutorial}
        />
        <TransformView 
            sourceImage={sourceImageForTransform} 
            isVisible={view === 'transform'} 
            isProcessing={isProcessing}
            onTransform={handlers.handleTransform}
            tags={availableTags}
            selectedTags={selectedTags}
            onTagToggle={handlers.handleTagToggle}
        />
        <ComparisonView
            generationDetails={generationDetails}
            sourceImage={sourceImageForTransform}
            isVisible={view === 'comparison'}
            mode={comparisonMode}
            onModeChange={(mode) => handlers.setState('comparisonMode', mode)}
            onSetName={handlers.handleSetName}
            onHide={handlers.handleHide}
        />
        <CommunityGalleryView
            isVisible={view === 'community_gallery'}
            items={communityGalleryItems}
            onVote={handlers.handleVote}
            modalItem={modalItem}
            onItemSelect={handlers.handleModalOpen}
            onModalClose={handlers.handleModalClose}
            fetchGallery={handlers.fetchCommunityGallery}
        />
      </main>
      
      <LogPanel messages={logMessages} isVisible={isProcessing} />
      
      <TutorialModal 
          isVisible={showTutorial} 
          onClose={handlers.handleCloseTutorial}
      />
    </div>
  );
}

export default App;

