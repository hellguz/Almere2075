import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader, Vector2 } from 'three';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const POLLING_INTERVAL = 2500; // ms

// --- Constants for Gallery Grid ---
const GAP_PX = 5; // The desired gap between images in pixels
const MAX_MAGNIFICATION = 4.0;
const MOUSE_INFLUENCE_RADIUS = 0.3;

// --- Constants for UI Layout ---
const LOG_PANEL_WIDTH = '450px';
const LOG_PANEL_HEIGHT = '300px';

// --- Global State ---
const AppState = {
  view: 'gallery', // gallery, transform, comparison
  comparisonMode: 'slider', // slider, side-by-side
  selectedImage: null,
  outputImage: null,
  isProcessing: false,
  logMessages: [],
  finalPrompt: '',
};
const state = AppState;

// --- Helper Functions ---
const formatTime = () => new Date().toLocaleTimeString('en-GB');

const listeners = new Set();
const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
const setState = (key, value) => {
  state[key] = value;
  listeners.forEach((listener) => listener());
};
const addLogMessage = (text, type = 'info') => {
    const newLog = { time: formatTime(), text, type };
    setState('logMessages', [...state.logMessages, newLog]);
};

// --- 3D Gallery Component ---

const ImagePlane = ({ texture, position, scale, onClick }) => {
    const groupRef = useRef();
    const originalPosition = useMemo(() => new Vector2(position[0], position[1]), [position]);
    // The 'scale' prop from GalleryGrid is the size of the square cell.
    const cellScale = useMemo(() => new Vector2(scale[0], scale[1]), [scale]);

    // Calculate the scale of the inner plane to preserve image aspect ratio within the cell
    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        const cellAspect = cellScale.x / cellScale.y; // This will be ~1

        if (imageAspect > cellAspect) {
            // Image is wider than cell, fit to cell width
            return [cellScale.x, cellScale.x / imageAspect, 1];
        } else {
            // Image is taller than cell, fit to cell height
            return [cellScale.y * imageAspect, cellScale.y, 1];
        }
    }, [texture, cellScale]);

    useFrame(({ viewport, mouse }) => {
        if (!groupRef.current) return;

        const mouseVec = new Vector2(mouse.x * viewport.width / 2, mouse.y * viewport.height / 2);
        const planeVec = new Vector2(groupRef.current.position.x, groupRef.current.position.y);
        
        const dist = mouseVec.distanceTo(planeVec);
        const influence = Math.pow(1 - Math.min(dist / (MOUSE_INFLUENCE_RADIUS * viewport.width), 1.0), 2.0);
        
        // The scaleFactor now animates the group, which acts as the cell container
        const scaleFactor = 1 + (MAX_MAGNIFICATION - 1) * influence;
        
        groupRef.current.scale.lerp({ x: scaleFactor, y: scaleFactor, z: 1 }, 0.1);
        
        // The displacement animation also applies to the group
        const displacement = new Vector2().subVectors(planeVec, mouseVec).normalize().multiplyScalar(influence * 0.4);
        groupRef.current.position.lerp({ x: originalPosition.x + displacement.x, y: originalPosition.y + displacement.y, z: influence * 0.5 }, 0.1);
    });

    return (
        // The group is the interactable 'cell'. It's positioned and animated.
        <group
            ref={groupRef}
            position={position}
        >
            {/* The visible mesh, correctly proportioned */}
            <mesh scale={imagePlaneScale}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
            {/* The invisible click target, filling the cell */}
            <mesh onClick={() => onClick(texture)} scale={[cellScale.x, cellScale.y, 1]} visible={false}>
                <planeGeometry args={[1, 1]} />
            </mesh>
        </group>
    );
};

const GalleryGrid = ({ images, onImageClick }) => {
    const textures = useLoader(TextureLoader, images.map(img => `${API_BASE_URL}/thumbnails/${img.thumbnail}`));
    const { size, viewport } = useThree();

    const grid = useMemo(() => {
        if (!textures.length || size.width === 0) return [];

        const imageCount = textures.length;
        const gapWorldUnits = (GAP_PX / size.width) * viewport.width;

        let bestGrid = { cols: 0, rows: 0, cellSize: 0 };

        // Find the grid layout that maximizes the size of the square cells
        for (let c = 1; c <= imageCount; c++) {
            const r = Math.ceil(imageCount / c);
            
            const cellSizeFromWidth = (viewport.width - (c + 1) * gapWorldUnits) / c;
            const cellSizeFromHeight = (viewport.height - (r + 1) * gapWorldUnits) / r;
            
            const cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);

            if (cellSize > bestGrid.cellSize) {
                bestGrid = { cols: c, rows: r, cellSize: cellSize };
            }
        }

        const items = [];
        const { cols, rows, cellSize } = bestGrid;
        
        const totalGridWidth = cols * cellSize + Math.max(0, cols - 1) * gapWorldUnits;
        const totalGridHeight = rows * cellSize + Math.max(0, rows - 1) * gapWorldUnits;

        for (let i = 0; i < imageCount; i++) {
            const c = i % cols;
            const r = Math.floor(i / cols);
            
            const x = -totalGridWidth / 2 + c * (cellSize + gapWorldUnits) + cellSize / 2;
            const y = totalGridHeight / 2 - r * (cellSize + gapWorldUnits) - cellSize / 2;

            items.push({
                index: i,
                texture: textures[i],
                position: [x, y, 0],
                scale: [cellSize, cellSize, 1], // All cells are uniform squares
            });
        }
        return items;
    }, [textures, viewport.width, viewport.height, size.width]);

    return (
        <group>
            {grid.map(item => (
                <ImagePlane key={item.index} {...item} onClick={onImageClick} />
            ))}
        </group>
    );
};


const GalleryView = ({ images, isVisible }) => {
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
      const handleInteraction = () => setShowInstructions(false);
      window.addEventListener('mousemove', handleInteraction, { once: true });
      window.addEventListener('click', handleInteraction, { once: true });
      const timer = setTimeout(() => setShowInstructions(false), 5000);
      return () => {
        window.removeEventListener('mousemove', handleInteraction);
        window.removeEventListener('click', handleInteraction);
        clearTimeout(timer);
      };
    }, []);

    const handleImageClick = (texture) => {
        const imageName = texture.image.src.split('/').pop();
        const fullImage = images.find(img => img.thumbnail === imageName);
        if (fullImage) {
            setState('selectedImage', fullImage);
            setState('view', 'transform');
            setState('finalPrompt', '');
            addLogMessage(`Source selected: ${fullImage.filename}`);
        }
    };

    return (
        <div className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${!isVisible ? 'in-background' : ''}`}>
             <div className={`gallery-instructions ${!showInstructions ? 'fade-out' : ''}`}>
                MOVE MOUSE TO EXPLORE. CLICK AN IMAGE TO BEGIN.
            </div>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <ambientLight intensity={3} />
                {images.length > 0 && <GalleryGrid images={images} onImageClick={handleImageClick} />}
            </Canvas>
        </div>
    );
};


// --- UI Components ---

const LogPanel = ({ messages, isVisible }) => {
  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
        className={`process-log-wrapper ${isVisible ? 'visible' : ''}`}
        style={{'--panel-width': LOG_PANEL_WIDTH, '--panel-height': LOG_PANEL_HEIGHT}}
    >
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

const TransformView = ({ image, isVisible, isProcessing, onTransform }) => {
    if (!image) return null;

    return (
        <div className={`transform-view ${isVisible ? 'visible' : ''}`}>
            <div className="main-image-container">
                <img src={`${API_BASE_URL}/images/${image.filename}`} alt="Selected for transformation" className="main-image" />
            </div>
            {isProcessing && <div className="scanline"></div>}
            {!isProcessing && (
                <div className="transform-controls">
                    <button onClick={onTransform}>TRANSFORM TO ALMERE 2075</button>
                </div>
            )}
        </div>
    );
};

const ComparisonView = ({ originalImage, outputImage, finalPrompt, isVisible, mode }) => {
    const sliderContainerRef = useRef(null);
    const [sliderActive, setSliderActive] = useState(true);
    const [clipPosition, setClipPosition] = useState(50);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    const handleMouseMove = (e) => {
        if (!sliderActive || !sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        setClipPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    };

    if (!originalImage || !outputImage) return null;

    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`}>
            {mode === 'side-by-side' && (
                <div className="comparison-view side-by-side">
                    <div className="image-panel"><div className="image-header">SOURCE</div><img src={`${API_BASE_URL}/images/${originalImage.filename}`} alt="Original" /></div>
                    <div className="image-panel"><div className="image-header">ALMERE 2075</div><img src={outputImage} alt="Transformed" /></div>
                </div>
            )}
            
            {mode === 'slider' && (
                <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleMouseMove} onMouseEnter={() => setSliderActive(true)} onMouseLeave={() => setSliderActive(false)}>
                    <div className="image-panel"><img src={`${API_BASE_URL}/images/${originalImage.filename}`} alt="Original" /></div>
                    <div className="image-panel after-image" style={{ clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}><img src={outputImage} alt="Almere 2075" /></div>
                    <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                </div>
            )}

            {finalPrompt && (
                <div
                    className={`prompt-container ${isPromptExpanded ? 'expanded' : ''}`}
                    onMouseEnter={() => setIsPromptExpanded(true)}
                    onMouseLeave={() => setIsPromptExpanded(false)}
                >
                    <div className="prompt-button">PROMPT</div>
                    <div className="prompt-panel-expandable">
                        <div className="prompt-header">GENERATED PROMPT</div>
                        <div className="prompt-content">
                            {finalPrompt}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---
function App() {
  const [appState, setAppState] = useState(state);
  const [galleryImages, setGalleryImages] = useState([]);
  const pollingRef = useRef(null);

  useEffect(() => subscribe(() => setAppState({ ...state })), []);

  useEffect(() => {
    const fetchGallery = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/gallery`);
            if (!response.ok) throw new Error(`Network error (${response.status})`);
            const images = await response.json();
            const validImages = images.filter(img => img.thumbnail);
            setGalleryImages(validImages);
        } catch (e) {
            console.error(`Error fetching library: ${e.message}`);
        }
    };
    fetchGallery();
    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleBack = () => {
    setState('view', 'gallery');
    setState('selectedImage', null);
    setState('outputImage', null);
    setState('isProcessing', false);
    setState('logMessages', []);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const pollJobStatus = useCallback((jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/job-status/${jobId}`);
        if (!res.ok) return; 
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(pollingRef.current);
          addLogMessage('--- Transformation Complete ---', 'success');
          setState('outputImage', data.result);
          setState('isProcessing', false);
          setState('view', 'comparison');

        } else if (data.status === 'failed') {
          clearInterval(pollingRef.current);
          throw new Error(data.error || 'Job failed for an unknown reason.');
        }
      } catch (err) {
        addLogMessage(`Polling failed: ${err.message}`, 'error');
        setState('isProcessing', false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, POLLING_INTERVAL);
  }, []);

  const handleTransform = useCallback(async () => {
    if (!state.selectedImage) return;

    setState('isProcessing', true);
    setState('logMessages', [{time: formatTime(), text: '--- Initiating Transformation Protocol ---', type: 'system'}]);
    
    try {
        addLogMessage('Step 1/3: Encoding source image...');
        const base64Reader = new Promise((resolve, reject) => {
            fetch(`${API_BASE_URL}/images/${state.selectedImage.filename}`).then(res => res.blob()).then(blob => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        });
        const base64Image = await base64Reader;
        addLogMessage('Source encoded successfully.');

        addLogMessage('Step 2/3: Generating vision prompt...');
        const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64Image }) });
        if (!promptResponse.ok) throw new Error(`AI Vision Conection failed: ${promptResponse.statusText}`);
        const promptData = await promptResponse.json();
        addLogMessage('Vision prompt generated.', 'success');
        addLogMessage(`Prompt: "${promptData.prompt}"`, 'data');
        setState('finalPrompt', promptData.prompt); // Save the prompt

        addLogMessage('Step 3/3: Submitting to FLUX renderer...');
        const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64Image, prompt: promptData.prompt }) });
        if (!transformResponse.ok) throw new Error(`FLUX renderer submission failed: ${transformResponse.statusText}`);
        const { job_id } = await transformResponse.json();
        addLogMessage(`Job submitted with ID: ${job_id}. Awaiting result...`, 'system');
        
        pollJobStatus(job_id);

    } catch (err) {
        addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
        setState('isProcessing', false);
    }
  }, [pollJobStatus]);

  return (
    <div className="app-container">
      <header className={`app-header ${appState.view !== 'gallery' ? 'visible' : ''}`}>
        <div className="header-left">
            <button onClick={handleBack} className="back-button">← BACK TO GALLERY</button>
        </div>
        <div className="header-center">
            {appState.view === 'comparison' && (
                <div className="view-mode-toggle">
                    <button className={appState.comparisonMode === 'slider' ? 'active' : ''} onClick={() => setState('comparisonMode', 'slider')}>Slider</button>
                    <button className={appState.comparisonMode === 'side-by-side' ? 'active' : ''} onClick={() => setState('comparisonMode', 'side-by-side')}>Side-by-Side</button>
                </div>
            )}
        </div>
        <div className="header-right" />
      </header>

      <main>
        <GalleryView images={galleryImages} isVisible={appState.view === 'gallery'} />
        <TransformView 
            image={appState.selectedImage} 
            isVisible={appState.view === 'transform'} 
            isProcessing={appState.isProcessing}
            onTransform={handleTransform}
        />
        <ComparisonView
            originalImage={appState.selectedImage} 
            outputImage={appState.outputImage} 
            finalPrompt={appState.finalPrompt}
            isVisible={appState.view === 'comparison'} 
            mode={appState.comparisonMode}
        />
      </main>

      <LogPanel messages={appState.logMessages} isVisible={appState.isProcessing} />
    </div>
  );
}

export default App;
