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
  comparisonMode: 'side-by-side', // Set side-by-side as default
  sourceImageForTransform: null, // Holds {url, name} for the image being processed
  isProcessing: false,
  logMessages: [],
  jobId: null,
  generationDetails: null, // Full data of the completed generation from the backend
  isCommunityItem: false, // Flag to know if the background should be blurred
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
            <p className="tag-selector-title">2. Choose concepts (or leave blank for random)</p>
            <div className="tag-list-wrapper">
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
            </div>
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
                        <button className="transform-action-button" onClick={onTransform} disabled={isProcessing}>
                            {isProcessing ? 'TRANSFORMING...' : '3. TRANSFORM TO ALMERE 2075'}
                        </button>
                    </div>
                </div>
            </div>
            {isProcessing && <div className="scanline"></div>}
        </div>
    );
};

const ComparisonView = ({ generationDetails, sourceImage, isVisible, mode, onModeChange, isModal = false, onSetName, onHide }) => {
    const sliderContainerRef = useRef(null);
    const [clipPosition, setClipPosition] = useState(50);
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

    const originalImageUrl = sourceImage?.url || `${API_BASE_URL}/images/${generationDetails.original_image_filename}`;
    const outputImageUrl = generationDetails.generated_image_url;

    return (
        <div className={`comparison-container ${isVisible ? 'visible' : ''}`}>
            {!isModal && (
                <div className="floating-controls-top">
                    <div className="view-mode-toggle">
                        <button className={mode === 'side-by-side' ? 'active' : ''} onClick={() => onModeChange('side-by-side')}>Side-by-Side</button>
                        <button className={mode === 'slider' ? 'active' : ''} onClick={() => onModeChange('slider')}>Slider</button>
                    </div>
                </div>
            )}
            <div className="comparison-main-area">
                {mode === 'side-by-side' && (
                    <div className="comparison-view side-by-side">
                        <div className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}><div className="image-header">SOURCE</div></div>
                        <div className="image-panel" style={{backgroundImage: `url("${outputImageUrl}")`}}><div className="image-header">ALMERE 2075</div></div>
                    </div>
                )}
                {mode === 'slider' && (
                    <div className="comparison-view slider-mode" ref={sliderContainerRef} onMouseMove={handleSliderMove} onTouchMove={handleSliderMove}>
                        <div className="image-panel" style={{backgroundImage: `url("${originalImageUrl}")`}}>
                            <div className="image-header">SOURCE</div>
                        </div>
                        <div className="image-panel after-image" style={{backgroundImage: `url("${outputImageUrl}")`, clipPath: `polygon(0 0, ${clipPosition}% 0, ${clipPosition}% 100%, 0 100%)` }}>
                            <div className="image-header">ALMERE 2075</div>
                        </div>
                        <div className="slider-line" style={{ left: `${clipPosition}%` }}><div className="slider-handle"></div></div>
                    </div>
                )}
            </div>
           
            <div className="comparison-footer">
                <div className="footer-left">
                     <div className="info-tags">
                        <b>Concepts:</b> {generationDetails.tags_used?.join(', ') || 'N/A'}
                    </div>
                    <div className="info-creator">
                        <b>By:</b> {generationDetails.creator_name || 'Anonymous'}
                    </div>
                </div>
                {!isModal && (
                    <div className="footer-center">
                        <div className="name-input-container">
                            <input type="text" placeholder="Sign your creation..." value={creatorName} onChange={(e) => setCreatorName(e.target.value)} disabled={nameSaved} />
                            <button onClick={handleNameSubmit} disabled={nameSaved || !creatorName.trim()}>
                                {nameSaved ? '✓ SAVED' : 'SAVE NAME'}
                            </button>
                        </div>
                    </div>
                )}
                <div className="footer-right">
                    {!isModal && (
                        <button className="hide-button" onClick={onHide} title="Remove from public gallery">REMOVE</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CommunityGalleryView = ({ isVisible, onVote, onItemSelect, modalItem, onModalClose }) => {
    const [items, setItems] = useState([]);
    const [modalComparisonMode, setModalComparisonMode] = useState('side-by-side');

    const fetchGallery = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/public-gallery`);
            if (!response.ok) throw new Error('Failed to fetch gallery');
            const data = await response.json();
            setItems(data);
        } catch (error) {
            console.error("Error fetching community gallery:", error);
        }
    }, []);

    useEffect(() => {
        if (isVisible && !modalItem) {
            fetchGallery();
        }
    }, [isVisible, modalItem, fetchGallery]);

    const handleVoteClick = (e, itemId) => {
        e.stopPropagation();
        onVote(itemId).then(() => {
            setItems(currentItems => currentItems.map(item => 
                item.id === itemId ? { ...item, votes: item.votes + 1 } : item
            ));
        }).catch(err => {
            alert(err.message);
        });
    };
    
    return (
        <div className={`community-gallery-view ${isVisible ? 'visible' : ''}`}>
            <div className="gallery-info-text">
                <p>Explore visions of Almere 2075 created by others. <b>Give a "👍" to your favorites</b> to help the city reach its happiness goal!</p>
            </div>
            <div className="gallery-grid-container">
                {items.map(item => (
                    <div key={item.id} className="gallery-item" onClick={() => onItemSelect(item)}>
                        <div className="gallery-item-images">
                            <img src={`${API_BASE_URL}/thumbnails/${item.original_image_filename.replace(/\.[^/.]+$/, ".jpeg")}`} alt="Original" className="gallery-item-thumb original"/>
                            <img src={item.generated_image_url} alt="Generated" className="gallery-item-thumb generated"/>
                        </div>
                        <div className="gallery-item-info">
                            <div className="gallery-item-tags">
                                {item.tags_used?.slice(0, 3).join(', ') || 'General Concept'}
                            </div>
                            <div className="gallery-item-creator">
                                by {item.creator_name || 'Anonymous'}
                            </div>
                            <button className="like-button" onClick={(e) => handleVoteClick(e, item.id)}>
                                👍 {item.votes}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {modalItem && (
                 <div className="modal-overlay" onClick={onModalClose}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="view-mode-toggle">
                                <button className={modalComparisonMode === 'side-by-side' ? 'active' : ''} onClick={() => setModalComparisonMode('side-by-side')}>Side-by-Side</button>
                                <button className={modalComparisonMode === 'slider' ? 'active' : ''} onClick={() => setModalComparisonMode('slider')}>Slider</button>
                            </div>
                             <button className="close-modal-button" onClick={onModalClose}>×</button>
                        </div>
                        <ComparisonView
                            generationDetails={modalItem}
                            isVisible={true}
                            isModal={true}
                            mode={modalComparisonMode}
                            onModeChange={setModalComparisonMode} /* Pass handler */
                        />
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
        const interval = setInterval(fetchStats, 10000); // Poll for new scores
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
            <div className="info-tooltip">
                <span>i</span>
                <div className="info-tooltip-text">
                    <b>Help Almere get happier!</b>
                    <br />
                    Every "👍" vote in the Community Gallery adds 1 Happy Point to the city's score.
                    Let's reach the goal of <b>1000 points</b> before the deadline on <b>July 13th</b>! You can vote once per minute.
                </div>
            </div>
            <div className="widget-main">
                <div className="score-display">
                    <span className="score-value">{stats.happiness_score}</span>
                    <span className="score-target"> / {stats.target_score}</span>
                    <span className="score-label">Happy Points</span>
                </div>
                <div className="score-bar-container">
                    <div className="score-bar" style={{ width: `${Math.min(100, (stats.happiness_score / stats.target_score) * 100)}%` }}></div>
                </div>
            </div>
            <div className="widget-deadline">
                <div className="countdown-text">{timeLeft || '...'}</div>
                <div className="countdown-label">Until Deadline</div>
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
  const [modalItem, setModalItem] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => subscribe(() => setAppState({ ...state })), []);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [galleryRes, tagsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/gallery`),
                fetch(`${API_BASE_URL}/tags`),
            ]);
            if (!galleryRes.ok) throw new Error(`Gallery fetch failed: ${galleryRes.statusText}`);
            if (!tagsRes.ok) throw new Error(`Tags fetch failed: ${tagsRes.statusText}`);
            
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
        addLogMessage(`Job submitted with ID: ${job_id}.`, 'system');
        
        addLogMessage('Step 3/3: Awaiting result...');
        pollJobStatus(job_id);

    } catch (err) {
        addLogMessage(`PROCESS FAILED: ${err.message}`, 'error');
        setState('isProcessing', false);
    }
  }, [pollJobStatus, selectedTags]);

  const resetState = () => {
    setState('sourceImageForTransform', null);
    setState('isProcessing', false);
    setState('logMessages', []);
    setState('jobId', null);
    setState('generationDetails', null);
    setState('isCommunityItem', false);
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
    const thumbnailSrc = texture.image.src;
    const thumbnailFilename = thumbnailSrc.split('/').pop();
    const fullImage = galleryImages.find(img => img.thumbnail === thumbnailFilename);
    
    if (fullImage) {
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

  const handleSetName = useCallback(async (name) => {
    const jobId = appState.jobId || appState.generationDetails?.id;
    if (!jobId) return;
    try {
        await fetch(`${API_BASE_URL}/generations/${jobId}/set-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (appState.generationDetails) {
            setState('generationDetails', { ...appState.generationDetails, creator_name: name });
        }
    } catch (error) {
       console.error("Failed to set name:", error);
    }
  }, [appState.jobId, appState.generationDetails]);

  const handleHide = useCallback(async () => {
    const jobId = appState.jobId || appState.generationDetails?.id;
    if (!jobId) return;
    if (confirm("Are you sure you want to permanently remove this image from the gallery? This cannot be undone.")) {
        try {
            await fetch(`${API_BASE_URL}/generations/${jobId}/hide`, { method: 'POST' });
            alert("This image has been removed from the public gallery.");
            handleBackToStart();
        } catch (error) {
            console.error("Failed to hide generation:", error);
            alert("Failed to hide generation. See console for details.");
        }
    }
  }, [appState.jobId, appState.generationDetails, handleBackToStart]);

  const handleVote = useCallback(async (generationId) => {
    try {
        const res = await fetch(`${API_BASE_URL}/generations/${generationId}/vote`, { method: 'POST' });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Vote failed");
        }
    } catch (error) {
        throw error;
    }
  }, []);

  const showGalleryBackground = (appState.view === 'transform' || appState.view === 'comparison') && !appState.isCommunityItem;

  return (
    <div className="app-container">
      <header className="app-header">
          <div className="header-left">
             {(appState.view !== 'gallery') && (
                <button onClick={handleBackToStart} className="back-button">← BACK TO START</button>
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
            onImageClick={handleSelectGalleryImage}
            onNewImage={handleStartTransform}
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
            sourceImage={appState.sourceImageForTransform}
            isVisible={appState.view === 'comparison'}
            mode={appState.comparisonMode}
            onModeChange={(mode) => setState('comparisonMode', mode)}
            onSetName={handleSetName}
            onHide={handleHide}
        />
        <CommunityGalleryView
            isVisible={appState.view === 'community_gallery'}
            onVote={handleVote}
            modalItem={modalItem}
            onItemSelect={(item) => {
                setState('isCommunityItem', true);
                setModalItem(item);
            }}
            onModalClose={() => {
                setState('isCommunityItem', false);
                setModalItem(null);
            }}
        />
      </main>
      
      <LogPanel messages={appState.logMessages} isVisible={appState.isProcessing} />
    </div>
  );
}

const GalleryView = ({ images, isVisible, isInBackground, onImageClick, onNewImage }) => {
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
            if (file.size > 15 * 1024 * 1024) { // 15MB limit
                alert("File is too large. Please select an image smaller than 15MB.");
                return;
            }
            const url = await fileToDataUrl(file);
            onNewImage({ url, name: file.name });
        }
        e.target.value = null; // Reset file input
    };

    return (
        <div className={`fullscreen-canvas-container ${isVisible ? 'visible' : ''} ${isInBackground ? 'in-background' : ''}`}>
            {!isInBackground && (
                <>
                    <div className={`gallery-instructions ${!showInstructions ? 'fade-out' : ''}`}>
                        {isTouchDevice ? 'DRAG TO EXPLORE. TAP AN IMAGE TO BEGIN.' : 'FOCUS TO EXPLORE. CLICK AN IMAGE TO BEGIN.'}
                    </div>
                    <div className="main-actions-container">
                        <button className="upload-button" onClick={() => fileInputRef.current?.click()}>... OR UPLOAD YOUR OWN IMAGE</button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}/>
                </>
            )}
            <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 100 }}>
                <ambientLight intensity={3} />
                {images.length > 0 && <DynamicGallery images={images} onImageClick={handleClick} isTouch={isTouchDevice} panOffset={panOffset} />}
                <GalleryEvents handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove} handlePointerUp={handlePointerUp} />
            </Canvas>
        </div>
    );
};

export default App;
