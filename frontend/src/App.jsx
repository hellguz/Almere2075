import { useState, useEffect, useRef } from 'react';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// --- Helper Functions & Components ---
const formatTime = () => new Date().toLocaleTimeString('en-GB');

const ProcessLog = ({ messages }) => {
  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="process-log">
      <div className="log-header">PROCESS LOG</div>
      <div className="log-content">
        {messages.map((msg, i) => (
          <p key={i} className={`log-message ${msg.type || ''}`}>
            <span>{msg.time}</span>
            <span>{msg.text}</span>
          </p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

const ImageContainer = ({ src, label }) => (
  <div className="image-panel">
    <div className="image-header">{label}</div>
    <div className="image-container">
      {src ? <img src={src} alt={label} /> : <div className="placeholder">{label} will appear here.</div>}
    </div>
  </div>
);


// --- Main Workbench Component ---

function App() {
  // State
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [outputImageUrl, setOutputImageUrl] = useState(null);
  const [logMessages, setLogMessages] = useState([{ time: formatTime(), text: 'Workbench initialized. Please select an image from the library.' }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Initial gallery fetch
  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setGalleryImages(data);
      } catch (e) {
        addLogMessage(`Error fetching image library: ${e.message}`, 'error');
        setError('Could not load image library. Please refresh.');
      }
    };
    fetchGallery();
  }, []);

  // --- Core Functions ---
  const addLogMessage = (text, type = 'info') => {
    setLogMessages(prev => [...prev, { time: formatTime(), text, type }]);
  };

  const handleSelectImage = (image) => {
    if (isProcessing) return;
    setSelectedImage(image);
    setOutputImageUrl(null);
    setError('');
    setLogMessages([{ time: formatTime(), text: `Source image selected: ${image.filename}` }]);
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setOutputImageUrl(null);
    setError('');
    addLogMessage('--- Transformation process started ---', 'system');

    try {
      // Step 1: Get Base64
      addLogMessage('Step 1/3: Preparing source image...');
      const base64Reader = new Promise((resolve, reject) => {
          fetch(`${API_BASE_URL}/images/${selectedImage.filename}`)
              .then(res => res.blob())
              .then(blob => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              });
      });
      const base64Image = await base64Reader;
      addLogMessage('Source image prepared successfully.');

      // Step 2: Generate Prompt
      addLogMessage('Step 2/3: Generating AI prompt via GPT-4... (Est. 5-10 seconds)');
      const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });
      if (!promptResponse.ok) throw new Error(`AI Prompt Generation failed: ${promptResponse.statusText}`);
      const promptData = await promptResponse.json();
      addLogMessage('AI prompt generated.', 'success');
      addLogMessage(`Prompt: "${promptData.prompt}"`, 'data');

      // Step 3: Transform Image
      addLogMessage('Step 3/3: Generating futuristic vision via FLUX.1... (Est. 30-45 seconds)');
      const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, prompt: promptData.prompt }),
      });
      if (!transformResponse.ok) throw new Error(`AI Image Generation failed: ${transformResponse.statusText}`);
      const transformData = await transformResponse.json();
      
      setOutputImageUrl(transformData.transformedImageUrl);
      addLogMessage('--- Transformation Complete ---', 'success');

    } catch (err) {
      addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
      setError('An error occurred during the process. See log for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="workbench-container">
      <aside className="library-panel">
        <div className="library-header">IMAGE LIBRARY</div>
        <div className="library-grid">
          {galleryImages.map(img => (
            <div
              key={img.filename}
              className={`grid-item ${selectedImage?.filename === img.filename ? 'selected' : ''}`}
              onClick={() => handleSelectImage(img)}
              title={img.filename}
            >
              {img.thumbnail ? (
                 <img src={`${API_BASE_URL}/thumbnails/${img.thumbnail}`} alt={img.filename} />
              ) : (
                <div className="thumb-placeholder">{img.filename.split('.').pop().toUpperCase()}</div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="main-panel">
        <div className="io-panel">
          <ImageContainer src={selectedImage ? `${API_BASE_URL}/images/${selectedImage.filename}`: null} label="SOURCE" />
          <div className="control-column">
             <button
                className="generate-button"
                onClick={handleGenerate}
                disabled={!selectedImage || isProcessing}
              >
                {isProcessing ? 'PROCESSING...' : 'ANALYZE & TRANSFORM'}
              </button>
              {error && <div className="error-box">{error}</div>}
          </div>
          <ImageContainer src={outputImageUrl} label="ALMERE 2075" />
        </div>
        <ProcessLog messages={logMessages} />
      </main>
    </div>
  );
}

export default App;


