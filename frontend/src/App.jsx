import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Loading Spinner Component
const LoadingIndicator = () => (
  <div className="loading-overlay">
    <div className="spinner"></div>
    <p>Generating your vision of Almere 2075... This may take a minute.</p>
  </div>
);

// Main App Component
function App() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [originalImage, setOriginalImage] = useState(null); // Will hold the Blob URL
  const [originalImageFile, setOriginalImageFile] = useState(null); // Will hold the File object
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [transformedImageUrl, setTransformedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch gallery images on component mount
  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gallery`);
        if (!response.ok) throw new Error('Failed to fetch gallery');
        const data = await response.json();
        setGalleryImages(data);
      } catch (err) {
        setError('Could not load example gallery. Please try again later.');
        console.error(err);
      }
    };
    fetchGalleryImages();
  }, []);

  // Convert a File object to a Base64 string
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOriginalImage(URL.createObjectURL(file));
      setOriginalImageFile(file);
      setTransformedImageUrl('');
      setGeneratedPrompt('');
      setError('');
    }
  };

  const handleGalleryClick = async (imageName) => {
    try {
      const imageUrl = `${API_BASE_URL}/images/${imageName}`;
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Could not load image: ${imageName}`);
      const imageBlob = await response.blob();
      const imageFile = new File([imageBlob], imageName, { type: imageBlob.type });
      
      setOriginalImage(URL.createObjectURL(imageFile));
      setOriginalImageFile(imageFile);
      setTransformedImageUrl('');
      setGeneratedPrompt('');
      setError('');
    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if (!originalImageFile) {
      setError('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedPrompt('');
    setTransformedImageUrl('');

    try {
      // 1. Convert image to Base64
      const base64Image = await toBase64(originalImageFile);

      // 2. Generate the prompt
      const promptResponse = await fetch(`${API_BASE_URL}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!promptResponse.ok) {
        const errData = await promptResponse.json();
        throw new Error(`Failed to generate prompt: ${errData.detail || promptResponse.statusText}`);
      }
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData.prompt);

      // 3. Transform the image using the new prompt
      const transformResponse = await fetch(`${API_BASE_URL}/transform-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, prompt: promptData.prompt }),
      });
      
      if (!transformResponse.ok) {
        const errData = await transformResponse.json();
        throw new Error(`Failed to transform image: ${errData.detail || transformResponse.statusText}`);
      }
      const transformData = await transformResponse.json();
      setTransformedImageUrl(transformData.transformedImageUrl);

    } catch (err) {
      setError(`An error occurred: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="app-container">
      {isLoading && <LoadingIndicator />}
      <header>
        <h1>Almere 2075 Vision Generator</h1>
      </header>

      <main>
        <section className="controls-section">
          <div className="gallery-container">
            <h3>Start with an example</h3>
            <div className="gallery">
              {galleryImages.length > 0 ? (
                galleryImages.map(img => (
                  <img
                    key={img}
                    src={`${API_BASE_URL}/thumbnails/${img}`}
                    alt={`Example view of Almere - ${img}`}
                    className="gallery-item"
                    onClick={() => handleGalleryClick(img)}
                  />
                ))
              ) : (
                <p>No example images found.</p>
              )}
            </div>
          </div>
          
          <div className="upload-actions">
            <label htmlFor="file-upload" className="file-upload-label">Or Upload Your Own Image</label>
            {/* CORRECTED: Added 'image/webp' to the accept attribute */}
            <input id="file-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
            <button className="generate-button" onClick={handleGenerate} disabled={!originalImage || isLoading}>
              {isLoading ? 'Generating...' : 'Generate Transformation'}
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}
        </section>

        <section className="results-section">
          <div className="image-display">
            <h3>Original Image</h3>
            <div className="image-container">
              {originalImage ? <img src={originalImage} alt="Original upload" /> : <p>Select an example or upload an image to begin.</p>}
            </div>
          </div>
          <div className="image-display">
            <h3>Almere 2075 Vision</h3>
            <div className="image-container">
              {transformedImageUrl ? <img src={transformedImageUrl} alt="Transformed Almere 2075 vision" /> : <p>Your transformed image will appear here.</p>}
            </div>
          </div>
        </section>

        {generatedPrompt && (
          <section className="prompt-display">
            <h3>Generated AI Prompt</h3>
            <div className="prompt-content">
              {generatedPrompt}
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>Almere 2075 Concept Visualizer</p>
      </footer>
    </div>
  );
}

export default App;
