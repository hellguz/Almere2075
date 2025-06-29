import { useState, useEffect, useRef, useCallback } from 'react';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MIN_LIBRARY_WIDTH = 200;
const MIN_LOG_HEIGHT = 100;
const POLLING_INTERVAL = 3000; // 3 seconds

// --- Helper Components ---
const formatTime = () => new Date().toLocaleTimeString('en-GB');
const Resizer = ({ onMouseDown, direction = 'vertical' }) => <div className={`resizer ${direction}`} onMouseDown={onMouseDown} />;

const ProcessLog = ({ messages, onGenerate, isProcessing, disabled }) => {
  const logEndRef = useRef(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  return (
    <div className="process-log-wrapper">
      <div className="log-header">Process Log</div>
      <div className="log-content">
        {messages.map((msg, i) => <p key={i} className={`log-message ${msg.type || ''}`}><span>{msg.time}</span><span>{msg.text}</span></p>)}
        <div ref={logEndRef} />
      </div>
      <div className="log-footer">
        <button className="generate-button" onClick={onGenerate} disabled={disabled || isProcessing}>
          {isProcessing ? 'PROCESSING...' : 'ANALYZE & TRANSFORM'}
        </button>
      </div>
    </div>
  );
};

const ComparisonPanel = ({ beforeSrc, afterSrc, viewMode, panelSplit, onSplitterMouseDown }) => {
    const sliderContainerRef = useRef(null);
    const [clipPosition, setClipPosition] = useState(50);
    const handleSliderMouseMove = (e) => {
        if (sliderContainerRef.current) {
            const rect = sliderContainerRef.current.getBoundingClientRect();
            setClipPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
        }
    };
    if (!beforeSrc) return <div className="comparison-panel"><div className="placeholder">Select an image from the library to begin.</div></div>;
    if (viewMode === 'side-by-side') {
        return (
            <div className="comparison-panel side-by-side">
                <div className="image-panel" style={{ width: `calc(${panelSplit}% - 1px)`}}><div className="image-container">{beforeSrc && <img src={beforeSrc} alt="Source" />}</div></div>
                <Resizer onMouseDown={onSplitterMouseDown} direction="vertical" />
                <div className="image-panel" style={{ width: `calc(${100 - panelSplit}% - 1px)`}}><div className="image-container">{afterSrc ? <img src={afterSrc} alt="Almere 2075" /> : <div className="placeholder dark">Output</div>}</div></div>
            </div>
        )
    }
    return (
        <div className="comparison-panel slider-mode" ref={sliderContainerRef} onMouseMove={afterSrc ? handleSliderMouseMove : null}>
            <div className="image-container"><img src={beforeSrc} alt="Source" /></div>
            {afterSrc && <>
                <div className="image-container after-image" style={{ clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}><img src={afterSrc} alt="Almere 2075" /></div>
                <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
            </>}
        </div>
    );
};

const MobileNav = ({ activeView, setActiveView, disabled }) => (
    <nav className="mobile-nav">
        <button className={activeView === 'library' ? 'active' : ''} onClick={() => setActiveView('library')}>Library</button>
        <button className={activeView === 'workbench' ? 'active' : ''} onClick={() => setActiveView('workbench')} disabled={disabled}>Workbench</button>
        <button className={activeView === 'log' ? 'active' : ''} onClick={() => setActiveView('log')} disabled={disabled}>Log</button>
    </nav>
);

function App() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [outputImageUrl, setOutputImageUrl] = useState(null);
  const [logMessages, setLogMessages] = useState([{ time: formatTime(), text: 'Workbench initialized. Please select an image.' }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('slider');
  const [panelSizes, setPanelSizes] = useState({ library: 280, log: 220, mainSplit: 50 });
  const [mobileView, setMobileView] = useState('library');
  const pollingRef = useRef(null);

  const handleMouseDown = useCallback((onDrag) => (startEvent) => {
    startEvent.preventDefault();
    const onMove = (moveEvent) => onDrag(moveEvent);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleLibraryResize = handleMouseDown((e) => setPanelSizes(p => ({ ...p, library: Math.max(MIN_LIBRARY_WIDTH, e.clientX) })));
  const handleLogResize = handleMouseDown((e) => setPanelSizes(p => ({ ...p, log: Math.max(MIN_LOG_HEIGHT, window.innerHeight - e.clientY) })));
  const handleMainSplitterResize = handleMouseDown((e) => {
    const container = document.querySelector('.side-by-side');
    if (container) {
      const rect = container.getBoundingClientRect();
      setPanelSizes(p => ({...p, mainSplit: Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100))}));
    }
  });

  const addLogMessage = (text, type = 'info') => setLogMessages(prev => [...prev, { time: formatTime(), text, type }]);
  const handleSelectImage = (image) => {
    if (isProcessing) return;
    setSelectedImage(image);
    setOutputImageUrl(null);
    setError('');
    setLogMessages([{ time: formatTime(), text: `Source image selected: ${image.filename}` }]);
    setMobileView('workbench');
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        if (!response.ok) throw new Error(`Network error (${response.status})`);
        setGalleryImages(await response.json());
      } catch (e) {
        addLogMessage(`Error fetching library: ${e.message}`, 'error');
        setError('Could not load image library.');
      }
    };
    fetchGallery();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const pollJobStatus = (jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/job-status/${jobId}`);
        if (!res.ok) return; // Silently ignore failed polls, wait for next one
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(pollingRef.current);
          setOutputImageUrl(data.result);
          addLogMessage('--- Transformation Complete ---', 'success');
          setIsProcessing(false);
          setMobileView('workbench');
        } else if (data.status === 'failed') {
          clearInterval(pollingRef.current);
          throw new Error(data.error || 'Job failed for an unknown reason.');
        }
      } catch (err) {
        addLogMessage(`Polling failed: ${err.message}`, 'error');
        setError('An error occurred while checking job status.');
        setIsProcessing(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, POLLING_INTERVAL);
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setOutputImageUrl(null);
    setError('');
    setMobileView('log');
    addLogMessage('--- Transformation process started ---', 'system');
    try {
      addLogMessage('Step 1/3: Preparing source image...');
      const base64Reader = new Promise((resolve, reject) => {
        fetch(`${API_BASE_URL}/images/${selectedImage.filename}`).then(res => res.blob()).then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      });
      const base64Image = await base64Reader;
      addLogMessage('Source image prepared successfully.');
      addLogMessage('Step 2/3: Generating AI prompt...');
      const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64Image }) });
      if (!promptResponse.ok) throw new Error(`AI Prompt Generation failed: ${promptResponse.statusText}`);
      const promptData = await promptResponse.json();
      addLogMessage('AI prompt generated.', 'success');
      addLogMessage(`Prompt: "${promptData.prompt}"`, 'data');
      addLogMessage('Step 3/3: Submitting image generation job...');
      const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64Image, prompt: promptData.prompt }) });
      if (!transformResponse.ok) throw new Error(`Job submission failed: ${transformResponse.statusText}`);
      const { job_id } = await transformResponse.json();
      addLogMessage(`Job submitted with ID: ${job_id}. Polling for result...`, 'system');
      pollJobStatus(job_id);
    } catch (err) {
      addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
      setError('An error occurred during the process.');
      setIsProcessing(false);
    }
  };

  return (
    <div className={`workbench-container mobile-view-${mobileView}`}>
      <aside className="library-panel" style={{ width: `${panelSizes.library}px`}}>
        <div className="library-header">Image Library</div>
        <div className="library-grid">
          {galleryImages.map(img => <div key={img.filename} className={`grid-item ${selectedImage?.filename === img.filename ? 'selected' : ''}`} onClick={() => handleSelectImage(img)} title={img.filename}>
            {img.thumbnail ? <img src={`${API_BASE_URL}/thumbnails/${img.thumbnail}`} alt={img.filename} /> : <div className="thumb-placeholder">{img.filename.split('.').pop().toUpperCase()}</div>}
          </div>)}
        </div>
      </aside>
      <Resizer onMouseDown={handleLibraryResize} direction="vertical" />
      <main className="main-panel">
        <div className="main-panel-header">
            <div className="main-panel-title">
                {viewMode === 'slider' && <span>Comparison View</span>}
                {viewMode === 'side-by-side' && <><span>SOURCE</span><span>ALMERE 2075</span></>}
            </div>
            <div className="view-mode-toggle">
                <button className={viewMode === 'slider' ? 'active' : ''} onClick={() => setViewMode('slider')}>Slider</button>
                <button className={viewMode === 'side-by-side' ? 'active' : ''} onClick={() => setViewMode('side-by-side')}>Side-by-Side</button>
            </div>
        </div>
        <ComparisonPanel beforeSrc={selectedImage ? `${API_BASE_URL}/images/${selectedImage.filename}`: null} afterSrc={outputImageUrl} viewMode={viewMode} panelSplit={panelSizes.mainSplit} onSplitterMouseDown={handleMainSplitterResize} />
        <Resizer onMouseDown={handleLogResize} direction="horizontal" />
        <div className="log-container" style={{ height: `${panelSizes.log}px` }}>
            <ProcessLog messages={logMessages} onGenerate={handleGenerate} isProcessing={isProcessing} disabled={!selectedImage} />
        </div>
      </main>
      <MobileNav activeView={mobileView} setActiveView={setMobileView} disabled={!selectedImage} />
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}

export default App;