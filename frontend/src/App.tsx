// Styles
import './App.css';

// Hooks and Store
import { useAppLogic } from './hooks/useAppLogic';
import { useStore } from './store';
import { useIsMobile } from './hooks/useIsMobile'; // ADDED: Hook to detect mobile

// UI Components
import LogPanel from './components/ui/LogPanel';
import GamificationWidget from './components/ui/GamificationWidget';
import ComparisonView from './components/ui/ComparisonView';
import TutorialModal from './components/ui/TutorialModal';

// Views
import GalleryView from './views/GalleryView';
import TransformView from './views/TransformView';
import CommunityGalleryView from './views/CommunityGalleryView';

/**
 * The main application component, which orchestrates the different views and UI elements.
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  const { handlers } = useAppLogic();
  const isMobile = useIsMobile(); // ADDED: Get mobile status

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
  const showBackButton = view !== 'gallery' && !modalItem;

  return (
    <div className="app-container">
      <header className="app-header">
          <div className="header-left">
             {showBackButton && (
                // MODIFIED: Text is shortened on mobile to prevent wrapping
                <button onClick={handlers.handleBackToStart} className="back-button">
                  {isMobile ? '← BACK' : '← BACK TO START'}
                </button>
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



