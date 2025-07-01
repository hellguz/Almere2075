import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader, Vector3, Vector2 } from 'three';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const POLLING_INTERVAL = 2000;

// --- Gallery Configuration ---
const GALLERY_CONFIG = {
  FALLOFF_RADIUS: 8.0,
  SCALE_CURVE: 7,
  MAX_SCALE: 3.0,
  MIN_SCALE: 1.2,
  GRID_DENSITY: 1.05,
  Z_LIFT: 2.0,
  DISTORTION_POWER: 0.8,
  DAMPING: 0.33,
};

// --- Global State ---
const AppState = {
  view: 'gallery', // gallery, transform, comparison, community_gallery
  comparisonMode: 'slider',
  selectedImage: null, // The source image from the initial gallery
  sourceImageForTransform: null, // Could be from gallery or a new upload
  outputImage: null,
  isProcessing: false,
  logMessages: [],
  finalPrompt: '',
  jobId: null,
  generationDetails: null, // Full data of the completed generation
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
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


// --- Dynamic Gallery Components (for initial image selection) ---

const ImageNode = ({ texture, homePosition, baseSize, onImageClick, isTouch }) => {
    const meshRef = useRef();
    const homeVec = useMemo(() => new Vector3(...homePosition), [homePosition]);

    const imagePlaneScale = useMemo(() => {
        const imageAspect = texture.image.width / texture.image.height;
        return [imageAspect > 1 ? baseSize : baseSize * imageAspect, imageAspect > 1 ? baseSize / imageAspect : baseSize, 1];
    }, [texture, baseSize]);
    useEffect(() => {
        if (isTouch && meshRef.current) {
            meshRef.current.position.set(...homePosition);
            meshRef.current.scale.set(1, 1, 1);
        }
    }, [isTouch, homePosition]);
    useFrame(({ viewport, mouse }) => {
        if (!meshRef.current || isTouch) return;

        const mouseVec = new Vector2(mouse.x * viewport.width / 2, mouse.y * viewport.height / 2);
        const homePos2D = new Vector2(homeVec.x, homeVec.y);

        const directionVec = new Vector2().subVectors(homePos2D, mouseVec);
        const dist = directionVec.length();
        
        const influenceRadius = GALLERY_CONFIG.FALLOFF_RADIUS;
        const normalizedDist = Math.min(dist / influenceRadius, 1.0);

        const distortedDist = Math.pow(normalizedDist, GALLERY_CONFIG.DISTORTION_POWER) * influenceRadius;
        const targetPosition = new Vector2().addVectors(mouseVec, directionVec.normalize().multiplyScalar(distortedDist));
        
        if (dist > influenceRadius) {
            targetPosition.copy(homePos2D);
        }

        const proximity = 1 - normalizedDist;
        const targetScale = GALLERY_CONFIG.MIN_SCALE + Math.pow(proximity, GALLERY_CONFIG.SCALE_CURVE) * (GALLERY_CONFIG.MAX_SCALE - GALLERY_CONFIG.MIN_SCALE);
        const targetZ = proximity * GALLERY_CONFIG.Z_LIFT;
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
        const center = tempPoints.slice(0, imageCount).reduce((acc, p) => acc.add(p), new Vector2(0,0)).multiplyScalar(1 / imageCount);
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

const GalleryEvents = ({ handlePointerDown, handlePointerMove, handlePointerUp }) => {
    const { viewport, size } = useThree();
    const moveHandler = (e) => handlePointerMove(e, viewport, size);
    return (
        <group
            onPointerDown={handlePointerDown}
            onPointerMove={moveHandler}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
};

// --- UI Components ---

const LogPanel = ({ messages, isVisible }) => {
  const logEndRef = useRef(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  return (
    <div className={`process-log-wrapper ${isVisible ? 'visible' : ''}`}>
      <div className="log-header">PROCESS LOG</div>
      <div className="log-content">
        {messages.map((msg, i) => (
          <p key={i} className={`log-message ${msg.type || 'info'}`}>
            <span>{msg.time}</span>
            <span>{msg.text}</span>
          </p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

const TagSelector = ({ tags, selectedTags, onTagToggle }) => {
    if (!tags.length) return null;
    return (
        <div className="tag-selector-container">
            <p className="tag-selector-title">2. Choose concepts to guide the AI</p>
            <div className="tag-list">
                {tags.map(tag => (
                    <button
                        key={tag.id}
                        className={`tag-button ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                        onClick={() => onTagToggle(tag.id)}
                        title={tag.description}
                    >
                        {tag.name}
                    </button>
                ))}
            </div>
             <p className="tag-selector-note">Or leave blank for a random selection.</p>
        </div>
    );
};


const TransformView = ({ sourceImage, isVisible, isProcessing, onTransform, tags, selectedTags, onTagToggle }) => {
    if (!sourceImage) return null;
    return (
        <div className={`transform-view ${isVisible ? 'visible' : ''}`}>
            <div className="transform-content">
                <div className="main-image-container">
                    <p className="transform-step-title">1. Source Image</p>
                    <img src={sourceImage.url} alt="Selected for transformation" className="main-image" />
                </div>
                <div className="transform-options">
                    <TagSelector tags={tags} selectedTags={selectedTags} onTagToggle={onTagToggle} />
                    <div className="transform-controls">
                        <button onClick={onTransform} disabled={isProcessing}>
                            {isProcessing ? 'TRANSFORMING...' : '3. TRANSFORM TO ALMERE 2075'}
                        </button>
                    </div>
                </div>
            </div>
            {isProcessing && <div className="scanline"></div>}
        </div>
    );
};

const ComparisonView = ({ generationDetails, isVisible, mode, onModeChange, onSetName, onHide, isModal = false }) => {
    const sliderContainerRef = useRef(null);
    const [clipPosition, setClipPosition] = useState(50);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [creatorName, setCreatorName] = useState('');
    const [nameSaved, setNameSaved] = useState(false);

    useEffect(() => {
        if (generationDetails) {
            setCreatorName(generationDetails.creator_name || '');
            setNameSaved(!!generationDetails.creator_name);
        }
    }, [generationDetails]);

    const handleSliderMove = (e) => {
        if (!sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = e.clientX ?? e.touches?.[0]?.clientX;
        if (x === undefined) return;
        setClipPosition(Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)));
    };

    const handleNameSubmit = () => {
        if (creatorName.trim()) {
            onSetName(creatorName);
            setNameSaved(true);
        }
    };

    if (!generationDetails) return null;

    const originalImageUrl = `${API_BASE_URL}/images/${generationDetails.original_image_filename}`;
    const outputImageUrl = generationDetails.generated_image_url;

    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`}>
            <div className="comparison-header">
                <div className="view-mode-toggle">
                    <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                    <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>Side-by-Side</button>
                </div>
            </div>

            <div className="comparison-main-area">
                {mode === 'side-by-side' && (
                    <div className="comparison-view side-by-side">
                        <div className="image-panel"><div className="image-header">SOURCE</div><img src={originalImageUrl} alt="Original" /></div>
                        <div className="image-panel"><div className="image-header">ALMERE 2075</div><img src={outputImageUrl} alt="Transformed" /></div>
                    </div>
                )}
                {mode === 'slider' && (
                    <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                        <div className="image-panel"><img src={originalImageUrl} alt="Original" /></div>
                        <div className="image-panel after-image" style={{ clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}><img src={outputImageUrl} alt="Almere 2075" /></div>
                        <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                    </div>
                )}
            </div>

            <div className="generation-info-panel">
                <div className="info-tags">
                    <b>Concepts Used:</b> {generationDetails.tags_used?.join(', ') || 'N/A'}
                </div>
                <div className="info-creator">
                    <b>Created by:</b> {generationDetails.creator_name || 'Anonymous'}
                </div>
                {!isModal && (
                    <div className="user-actions">
                        <div className="name-input-container">
                            <input
                                type="text"
                                placeholder="Enter your name (optional)"
                                value={creatorName}
                                onChange={(e) => setCreatorName(e.target.value)}
                                disabled={nameSaved}
                            />
                            <button onClick={handleNameSubmit} disabled={nameSaved || !creatorName.trim()}>
                                {nameSaved ? 'SAVED' : 'SAVE NAME'}
                            </button>
                        </div>
                        <button className="hide-button" onClick={onHide}>REMOVE FROM GALLERY</button>
                    </div>
                )}
            </div>
             {generationDetails.prompt_text && (
                 <div className={`prompt-container ${isPromptExpanded ? 'expanded' : ''}`}>
                    <div className="prompt-button" onClick={() => setIsPromptExpanded(!isPromptExpanded)}>
                        {isPromptExpanded ? 'HIDE' : 'SHOW'} PROMPT
                    </div>
                    <div className="prompt-panel-expandable">
                        <div className="prompt-header">GENERATED PROMPT</div>
                        <div className="prompt-content">{generationDetails.prompt_text}</div>
                    </div>
                    {isPromptExpanded && <div className="prompt-overlay" onClick={() => setIsPromptExpanded(false)}></div>}
                </div>
             )}
        </div>
    );
};

const CommunityGalleryView = ({ isVisible, onBack, onVote }) => {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [comparisonMode, setComparisonMode] = useState('slider');

    useEffect(() => {
        if (isVisible) {
            const fetchGallery = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/public-gallery`);
                    if (!response.ok) throw new Error('Failed to fetch gallery');
                    const data = await response.json();
                    setItems(data);
                } catch (error) {
                    console.error("Error fetching community gallery:", error);
                }
            };
            fetchGallery();
        }
    }, [isVisible]);

    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`}>
            <header className="community-header">
                <button onClick={onBack} className="back-button">← BACK TO START</button>
                <h2>Community Gallery</h2>
                <div/>
            </header>
            <div className="gallery-grid-container">
                {items.map(item => (
                    <div key={item.id} className="gallery-item">
                        <div className="gallery-item-images" onClick={() => setSelectedItem(item)}>
                            <img src={`${API_BASE_URL}/images/${item.original_image_filename}`} alt="Original" className="gallery-item-thumb"/>
                            <img src={item.generated_image_url} alt="Generated" className="gallery-item-thumb"/>
                        </div>
                        <div className="gallery-item-info">
                            <div className="gallery-item-tags">
                                {item.tags_used?.slice(0, 3).join(', ') || 'General Concept'}
                            </div>
                            <div className="gallery-item-creator">
                                by {item.creator_name || 'Anonymous'}
                            </div>
                            <button className="vote-button" onClick={() => onVote(item.id)}>
                                ▲ VOTE ({item.votes})
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedItem && (
                 <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <ComparisonView
                            generationDetails={selectedItem}
                            isVisible={true}
                            isModal={true}
                            mode={comparisonMode}
                            onModeChange={setComparisonMode}
                        />
                         <button className="close-modal-button" onClick={() => setSelectedItem(null)}>×</button>
                    </div>
                 </div>
            )}
        </div>
    );
};


const GamificationWidget = () => {
    const [stats, setStats] = useState({ happiness_score: 0, target_score: 1000, deadline_iso: '' });
    const [timeLeft, setTimeLeft] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/gamification-stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error("Error fetching gamification stats:", error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 15000); // Refresh stats every 15 seconds
        return () => clearInterval(interval);
    }, [fetchStats]);

    useEffect(() => {
        if (!stats.deadline_iso) return;
        const interval = setInterval(() => {
            const now = new Date();
            const deadline = new Date(stats.deadline_iso);
            const diff = deadline - now;
            if (diff <= 0) {
                setTimeLeft('DEADLINE REACHED');
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [stats.deadline_iso]);

    return (
        <div className="gamification-widget">
            <div className="happiness-score">
                <div className="score-title">ALMERE HAPPINESS SCORE</div>
                <div className="score-bar-container">
                    <div className="score-bar" style={{ width: `${Math.min(100, (stats.happiness_score / stats.target_score) * 100)}%` }}></div>
                </div>
                <div className="score-text">{stats.happiness_score} / {stats.target_score} Happy Points</div>
            </div>
            <div className="countdown-timer">
                <div className="countdown-title">TIME UNTIL DEADLINE</div>
                <div className="countdown-text">{timeLeft}</div>
            </div>
             <div className="info-tooltip">
                <span>ℹ️</span>
                <div className="info-tooltip-text">
                    Help make Almere a happier city! Every vote on a generated image in the Community Gallery adds one "Happy Point" to the total score. You can vote once per minute. Let's reach 1000 points before the deadline!
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
function App() {
  const [appState, setAppState] = useState(state);
  const [galleryImages, setGalleryImages] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const pollingRef = useRef(null);

  // --- State & API Data Loading ---
  useEffect(() => subscribe(() => setAppState({ ...state })), []);
  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [galleryRes, tagsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/gallery`),
                fetch(`${API_BASE_URL}/tags`),
            ]);
            if (!galleryRes.ok) throw new Error(`Network error (${galleryRes.status})`);
            if (!tagsRes.ok) throw new Error(`Network error (${tagsRes.status})`);
            
            const images = await galleryRes.json();
            const validImages = images.filter(img => img.thumbnail);
            setGalleryImages(validImages);

            const tags = await tagsRes.json();
            setAvailableTags(tags);

        } catch (e) {
            console.error(`Error fetching initial data: ${e.message}`);
        }
    };
    fetchInitialData();
    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);
  
  // --- Core Transformation Logic ---
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
          setState('generationDetails', data.generation_data);
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
    if (!state.sourceImageForTransform) return;
    
    setState('isProcessing', true);
    setState('view', 'transform');
    setState('logMessages', [{time: formatTime(), text: '--- Initiating Transformation Protocol ---', type: 'system'}]);
    
    try {
        addLogMessage('Step 1/3: Generating vision prompt...');
        const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ imageBase64: state.sourceImageForTransform.url, tags: selectedTags }) 
        });
        if (!promptResponse.ok) throw new Error(`AI Vision Conection failed: ${promptResponse.statusText}`);
        const promptData = await promptResponse.json();
        addLogMessage('Vision prompt generated.', 'success');
        addLogMessage(`Prompt: "${promptData.prompt}"`, 'data');
        setState('finalPrompt', promptData.prompt);

        addLogMessage('Step 2/3: Submitting to FLUX renderer...');
        const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                imageBase64: state.sourceImageForTransform.url, 
                prompt: promptData.prompt,
                tags: promptData.tags_used,
                original_filename: state.sourceImageForTransform.name
            }) 
        });
        if (!transformResponse.ok) throw new Error(`FLUX renderer submission failed: ${transformResponse.statusText}`);
        const { job_id } = await transformResponse.json();
        setState('jobId', job_id);
        addLogMessage(`Job submitted with ID: ${job_id}. Awaiting result...`, 'system');
        
        addLogMessage('Step 3/3: Awaiting result...');
        pollJobStatus(job_id);

    } catch (err) {
        addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
        setState('isProcessing', false);
    }
  }, [pollJobStatus, selectedTags]);

  const resetState = () => {
    setState('selectedImage', null);
    setState('sourceImageForTransform', null);
    setState('outputImage', null);
    setState('isProcessing', false);
    setState('logMessages', []);
    setState('finalPrompt', '');
    setState('jobId', null);
    setState('generationDetails', null);
    setSelectedTags([]);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const handleBackToStart = () => {
    resetState();
    setState('view', 'gallery');
  };

  const handleStartTransform = (sourceImage) => {
    resetState();
    setState('sourceImageForTransform', sourceImage);
    setState('view', 'transform');
    addLogMessage(`Source selected: ${sourceImage.name}`);
  };
  
  const handleSelectGalleryImage = (texture) => {
    // MODIFIED: This logic is now fixed to prevent the 404 error.
    const thumbnailSrc = texture.image.src;
    // Extract the thumbnail filename (e.g., 'IMG_1234.jpeg') from the full URL
    const thumbnailFilename = thumbnailSrc.split('/').pop();

    // Find the corresponding full image data from the initial gallery list
    const fullImage = galleryImages.find(img => img.thumbnail === thumbnailFilename);
    
    if (fullImage) {
        // Construct the correct source object using the original filename
        const source = {
            url: `${API_BASE_URL}/images/${fullImage.filename}`,
            name: fullImage.filename
        };
        handleStartTransform(source);
    } else {
        console.error("Could not find matching full-size image for thumbnail:", thumbnailFilename);
        alert("An error occurred while selecting the image. Please try another one.");
    }
  };

  // --- User Action Handlers ---
  const handleSetName = useCallback(async (name) => {
    if (!appState.jobId) return;
    try {
        await fetch(`${API_BASE_URL}/generations/${appState.jobId}/set-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        // Optimistically update local state
        setState('generationDetails', { ...appState.generationDetails, creator_name: name });
    } catch (error) {
        console.error("Failed to set name:", error);
    }
  }, [appState.jobId, appState.generationDetails]);

  const handleHide = useCallback(async () => {
    if (!appState.jobId) return;
    try {
        await fetch(`${API_BASE_URL}/generations/${appState.jobId}/hide`, { method: 'POST' });
        alert("This image has been removed from the public gallery.");
        handleBackToStart();
    } catch (error) {
        console.error("Failed to hide generation:", error);
    }
  }, [appState.jobId]);

  const handleVote = useCallback(async (generationId) => {
    try {
        const res = await fetch(`${API_BASE_URL}/generations/${generationId}/vote`, { method: 'POST' });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Vote failed");
        }
        // No need to refresh all data, widget will poll for new score
    } catch (error) {
        alert(error.message); // Give user feedback
    }
  }, []);

  // --- Main Render ---
  return (
    <div className="app-container">
      <header className={`app-header ${appState.view !== 'gallery' ? 'visible' : ''}`}>
        <button onClick={handleBackToStart} className="back-button">← BACK TO START</button>
      </header>

      <main>
        <GalleryView 
            images={galleryImages} 
            isVisible={appState.view === 'gallery'} 
            onImageClick={handleSelectGalleryImage}
            onNewImage={handleStartTransform}
            onCommunityClick={() => setState('view', 'community_gallery')}
        />
        <TransformView 
            sourceImage={appState.sourceImageForTransform} 
            isVisible={appState.view === 'transform'} 
            isProcessing={appState.isProcessing}
            onTransform={handleTransform}
            tags={availableTags}
            selectedTags={selectedTags}
            onTagToggle={(tagId) => setSelectedTags(current => 
                current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId]
            )}
        />
        <ComparisonView
            generationDetails={appState.generationDetails}
            isVisible={appState.view === 'comparison'} 
            mode={appState.comparisonMode}
            onModeChange={(mode) => setState('comparisonMode', mode)}
            onSetName={handleSetName}
            onHide={handleHide}
        />
        <CommunityGalleryView
            isVisible={appState.view === 'community_gallery'}
            onBack={handleBackToStart}
            onVote={handleVote}
        />
      </main>

      <GamificationWidget />
      <LogPanel messages={appState.logMessages} isVisible={appState.isProcessing} />
    </div>
  );
}

const GalleryView = ({ images, isVisible, onImageClick, onNewImage, onCommunityClick }) => {
    const [showInstructions, setShowInstructions] = useState(true);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const panState = useRef({ isPanning: false, startCoords: { x: 0, y: 0 }, lastOffset: { x: 0, y: 0 } });
    const fileInputRef = useRef(null);
    
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
            const x = e.nativeEvent.touches?.[0]?.clientX ?? e.clientX;
            const y = e.nativeEvent.touches?.[0]?.clientY ?? e.clientY;
            panState.current.isPanning = true;
            panState.current.startCoords = { x, y };
            panState.current.lastOffset = panOffset;
        }
    };
    const handlePointerMove = (e, viewport, size) => {
        if (panState.current.isPanning) {
            const x = e.nativeEvent.touches?.[0]?.clientX ?? e.clientX;
            const y = e.nativeEvent.touches?.[0]?.clientY ?? e.clientY;
            if (x === undefined || y === undefined || panState.current.startCoords.x === undefined) return;
            const dx = (x - panState.current.startCoords.x) * (viewport.width / size.width);
            const dy = (y - panState.current.startCoords.y) * (viewport.height / size.height);
            setPanOffset({ x: panState.current.lastOffset.x + dx, y: panState.current.lastOffset.y - dy });
        }
    };
    const handlePointerUp = () => { if (panState.current.isPanning) { panState.current.isPanning = false; } };
    const handleClick = (texture) => { if (!panState.current.isPanning) { onImageClick(texture); } };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = await fileToDataUrl(file);
            onNewImage({ url, name: file.name });
        }
        e.target.value = null; // Reset file input
    };

    const handleTakePhoto = async () => {
        alert("Camera access is not yet implemented in this version.");
        // Placeholder for future implementation:
        // try {
        //     const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        //     // Handle video stream to capture a photo
        // } catch (error) {
        //     console.error("Camera access denied:", error);
        //     alert("Could not access camera. Please check permissions.");
        // }
    };
    
    return (
        <div className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${!isVisible ? 'in-background' : ''}`}>
            <div className={`gallery-instructions ${!showInstructions ? 'fade-out' : ''}`}>
                {isTouchDevice ? 'DRAG TO EXPLORE. TAP TO BEGIN.' : 'FOCUS TO EXPLORE. CLICK TO BEGIN.'}
            </div>
            <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 100 }}>
                <ambientLight intensity={3} />
                {images.length > 0 && <DynamicGallery images={images} onImageClick={handleClick} isTouch={isTouchDevice} panOffset={panOffset} />}
                <GalleryEvents handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp} />
            </Canvas>
             <div className="main-actions-container">
                <button className="main-action-button" onClick={handleTakePhoto}>TAKE PHOTO</button>
                <button className="main-action-button" onClick={() => fileInputRef.current?.click()}>SELECT PHOTO</button>
                <button className="main-action-button secondary" onClick={onCommunityClick}>COMMUNITY GALLERY</button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }}/>
        </div>
    );
};

export default App;

