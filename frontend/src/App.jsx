import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader, Vector3, Vector2 } from 'three';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const POLLING_INTERVAL = 1000;

// --- Gallery Configuration ---
const GALLERY_CONFIG = {
  // --- Focus & Falloff Controls ---
  FALLOFF_RADIUS: 8.0,     // The radius of the "magnifying glass" effect. Smaller numbers create a tighter, more focused lens.
  SCALE_CURVE: 7,          // The power of the scaling curve. Higher numbers create a sharper drop-off in size.

  // --- Visual Appearance ---
  MAX_SCALE: 3.0,          // Maximum size of the focused image.
  MIN_SCALE: 1.2,            // Minimum size of the peripheral images.
  GRID_DENSITY: 1.05,      // How tightly packed the initial grid is. < 1 means larger images, > 1 means smaller, denser images.
  // --- Animation Physics ---
  Z_LIFT: 2.0,             // How much the focused image "pops" towards the viewer.
  DISTORTION_POWER: 0.8,   // The power of the fisheye lens distortion. < 1 expands the center, > 1 compresses it.
  DAMPING: 0.33,           // The "springiness" of the animation. Lower values are more fluid and gentle.
};


// --- UI Layout ---
const LOG_PANEL_WIDTH = '550px';
const LOG_PANEL_HEIGHT = '500px';
// --- Global State ---
const AppState = {
  view: 'gallery',
  comparisonMode: 'slider', // 'slider' or 'side-by-side'
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


// --- Dynamic Gallery Components ---

const ImageNode = ({ texture, homePosition, baseSize, onImageClick, isTouch }) => {
    const meshRef = useRef();
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        return [imageAspect > 1 ? baseSize : baseSize * imageAspect, imageAspect > 1 ? baseSize / imageAspect : baseSize, 1];
    }, [texture, baseSize]);

    useEffect(() => {
        if (isTouch && meshRef.current) {
            // Reset position and scale when touch is detected
            meshRef.current.position.set(...homePosition);
            meshRef.current.scale.set(1, 1, 1);
        }
    }, [isTouch, homePosition]);

    useFrame(({ viewport, mouse }) => {
        if (!meshRef.current || isTouch) return; // Disable effect on touch devices

        const mouseVec = new Vector2(mouse.x * viewport.width / 2, mouse.y * viewport.height / 2);
        const homePos2D = new Vector2(homeVec.x, homeVec.y);

        const directionVec = new Vector2().subVectors(homePos2D, mouseVec);
        const dist = directionVec.length();
        
        const influenceRadius = GALLERY_CONFIG.FALLOFF_RADIUS;
        const normalizedDist = Math.min(dist / influenceRadius, 1.0);

        // --- Position: Apply the fisheye distortion ---
        const distortedDist = Math.pow(normalizedDist, GALLERY_CONFIG.DISTORTION_POWER) * influenceRadius;
        const targetPosition = new Vector2().addVectors(mouseVec, directionVec.normalize().multiplyScalar(distortedDist));
        
        if (dist > influenceRadius) {
            targetPosition.copy(homePos2D);
        }

        // --- Scale & Z-Depth: Based on proximity ---
        const proximity = 1 - normalizedDist;
        const targetScale = GALLERY_CONFIG.MIN_SCALE + Math.pow(proximity, GALLERY_CONFIG.SCALE_CURVE) * (GALLERY_CONFIG.MAX_SCALE - GALLERY_CONFIG.MIN_SCALE);
        const targetZ = proximity * GALLERY_CONFIG.Z_LIFT;
        // --- Animate ---
        meshRef.current.position.lerp(new Vector3(targetPosition.x, targetPosition.y, targetZ), GALLERY_CONFIG.DAMPING);
        meshRef.current.scale.lerp(new Vector3(targetScale, targetScale, 1), GALLERY_CONFIG.DAMPING);
    });

    return (
        <group ref={meshRef} position={homePosition} onClick={() => onImageClick(texture)}>
             <mesh scale={imagePlaneScale}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
        </group>
    );
};

const DynamicGallery = ({ images, onImageClick, isTouch, panOffset }) => {
    const textures = useLoader(TextureLoader, images.map(img => `${API_BASE_URL}/thumbnails/${img.thumbnail}`));
    const { viewport } = useThree();

    const grid = useMemo(() => {
        if (!textures.length || viewport.width === 0) return [];
        const imageCount = images.length;
        const { width, height } = viewport;
        
        const items = [];
        
        // --- Simplified & Robust Hexagonal Grid Generation ---
        const tempPoints = [];
        const hexSize = Math.sqrt((width * height) / (imageCount * 1.5 * Math.sqrt(3))) / GALLERY_CONFIG.GRID_DENSITY;
        const hexWidth = Math.sqrt(3) * hexSize;
        const hexHeight = 2 * hexSize;
        
        const cols = Math.ceil(width / hexWidth);
        const rows = Math.ceil(height / (hexHeight * 0.75));

        for (let row = 0; row < rows + 2; row++) {
            for (let col = 0; col < cols + 2; col++) {
                 tempPoints.push(new Vector2(
                    col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0),
                    row * hexHeight * 0.75
                ));
            }
        }

        const center = tempPoints.slice(0, imageCount)
                               .reduce((acc, p) => acc.add(p), new Vector2(0,0))
                               .multiplyScalar(1 / imageCount);
        for (let i = 0; i < imageCount; i++) {
            const point = tempPoints[i];
            items.push({
                index: i,
                texture: textures[i],
                homePosition: [point.x - center.x, point.y - center.y, 0],
                baseSize: (hexWidth / Math.sqrt(3)) * 1.1,
            });
        }

        return items;
    }, [images, textures, viewport.width, viewport.height]);
    return (
        <group position={[panOffset.x, panOffset.y, 0]}>
            {grid.map(item => (
                <ImageNode key={item.index} {...item} onImageClick={onImageClick} isTouch={isTouch} />
            ))}
        </group>
    );
};

const GalleryView = ({ images, isVisible }) => {
    const [showInstructions, setShowInstructions] = useState(true);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panState = useRef({
        isPanning: false,
        startCoords: { x: 0, y: 0 },
        lastOffset: { x: 0, y: 0 },
    });

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

    const handlePointerDown = (e) => {
        if (e.pointerType === 'touch') {
            if (!isTouchDevice) setIsTouchDevice(true);
            panState.current.isPanning = true;
            panState.current.startCoords = { x: e.clientX, y: e.clientY };
            panState.current.lastOffset = panOffset;
        }
    };

    const handlePointerMove = (e) => {
        if (panState.current.isPanning) {
            // Get viewport and size directly from the event object
            const { viewport, size } = e;
            // Convert pixel delta to world units for orthographic camera
            const dx = (e.clientX - panState.current.startCoords.x) * (viewport.width / size.width);
            const dy = (e.clientY - panState.current.startCoords.y) * (viewport.height / size.height);
            setPanOffset({
                x: panState.current.lastOffset.x + dx,
                y: panState.current.lastOffset.y - dy, // Y is inverted in screen vs world
            });
        }
    };

    const handlePointerUp = (e) => {
        panState.current.isPanning = false;
    };


    const handleImageClick = (texture) => {
        if (isTouchDevice && panState.current.isPanning) return;
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
                {isTouchDevice ? 'DRAG TO EXPLORE. TAP TO BEGIN.' : 'FOCUS TO EXPLORE. CLICK TO BEGIN.'}
            </div>
            <Canvas 
                orthographic camera={{ position: [0, 0, 10], zoom: 100 }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                 <ambientLight intensity={3} />
                {images.length > 0 && <DynamicGallery images={images} onImageClick={handleImageClick} isTouch={isTouchDevice} panOffset={panOffset} />}
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
    const [clipPosition, setClipPosition] = useState(50);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const togglePrompt = () => setIsPromptExpanded(!isPromptExpanded);

    const handleSliderMove = (e) => {
        if (!sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        if (x === undefined) return;
        setClipPosition(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
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
                 <div 
                    className="comparison-view slider-mode" 
                    ref={sliderContainerRef} 
                    onMouseMove={handleSliderMove}
                    onTouchMove={handleSliderMove}
                >
                    <div className="image-panel"><img src={`${API_BASE_URL}/images/${originalImage.filename}`} alt="Original" /></div>
                    <div className="image-panel after-image" style={{ clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}><img src={outputImage} alt="Almere 2075" /></div>
                    <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                </div>
            )}

            {finalPrompt && (
                <>
                    <div className={`prompt-container ${isPromptExpanded ? 'expanded' : ''}`}>
                        <div className="prompt-button" onClick={togglePrompt}>
                            {isPromptExpanded ? 'HIDE' : 'SHOW'} PROMPT
                        </div>
                        <div className="prompt-panel-expandable">
                            <div className="prompt-header">GENERATED PROMPT</div>
                            <div className="prompt-content">
                                {finalPrompt}
                            </div>
                        </div>
                    </div>
                    {isPromptExpanded && <div className="prompt-overlay" onClick={togglePrompt}></div>}
                </>
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
        addLogMessage('Vision prompt generated.');
        addLogMessage(`Prompt: "${promptData.prompt}"`, 'success');
        setState('finalPrompt', promptData.prompt);

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
            <button onClick={handleBack} className="back-button">← RETURN TO GALLERY</button>
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