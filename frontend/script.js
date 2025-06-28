// frontend/script.js (Added logic to stop on AI refusal)

document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('image-upload');
    const uploadButton = document.getElementById('upload-button');
    const generateButton = document.getElementById('generate-button');
    
    const originalImage = document.getElementById('original-image');
    const originalImagePlaceholder = document.getElementById('original-image-placeholder');
    
    const transformedImage = document.getElementById('transformed-image');
    const transformedImagePlaceholder = document.getElementById('transformed-image-placeholder');
    
    const generatedPrompt = document.getElementById('generated-prompt');
    const loader = document.getElementById('loader');
    const galleryContainer = document.querySelector('.gallery-thumbnails');

    const BACKEND_URL = 'http://localhost:3000'; 

    let uploadedImageBase64 = null;

    uploadButton.addEventListener('click', () => imageUpload.click());
    originalImagePlaceholder.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);
    generateButton.addEventListener('click', handleGeneration);
    galleryContainer.addEventListener('click', handleExampleImageClick);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            displayOriginalImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    async function handleExampleImageClick(event) {
        if (event.target.classList.contains('thumbnail')) {
            const imageUrl = event.target.src;
            try {
                // To show loading state while fetching the example
                originalImage.style.display = 'none';
                originalImagePlaceholder.style.display = 'flex';
                originalImagePlaceholder.querySelector('span').textContent = 'Loading example...';
                generateButton.disabled = true;

                const base64Data = await loadImageAsBase64(imageUrl);
                displayOriginalImage(base64Data);
            } catch (error) {
                console.error("Failed to load example image:", error);
                alert("Could not load the example image.");
                originalImagePlaceholder.querySelector('span').textContent = 'Click to upload image';
            }
        }
    }

    async function loadImageAsBase64(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function displayOriginalImage(base64Data) {
        // Reset state
        transformedImage.style.display = 'none';
        transformedImage.src = '';
        transformedImagePlaceholder.style.display = 'flex';
        generatedPrompt.textContent = 'The generated prompt will appear here once the transformation begins.';

        // Set new image
        uploadedImageBase64 = base64Data;
        originalImage.src = uploadedImageBase64;
        originalImage.style.display = 'block';
        originalImagePlaceholder.style.display = 'none';
        generateButton.disabled = false;
    }

    async function handleGeneration() {
        if (!uploadedImageBase64) {
            alert('Please upload an image first.');
            return;
        }
        setLoading(true);

        try {
            generatedPrompt.textContent = 'Generating prompt with AI...';
            const { prompt } = await fetchFromBackend('/generate-prompt', { imageBase64: uploadedImageBase64 });
            generatedPrompt.textContent = prompt;

            const refusalKeywords = ["sorry", "can't process", "unable to", "could not be processed"];
            if (refusalKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
                console.log("AI refused to process the image. Halting process.");
                transformedImagePlaceholder.style.display = 'flex'; 
                setLoading(false); 
                return; 
            }

            const { transformedImageUrl } = await fetchFromBackend('/transform-image', { imageBase64: uploadedImageBase64, prompt });
            console.log("Received image URL from backend:", transformedImageUrl);

            if (transformedImageUrl) {
                transformedImage.src = transformedImageUrl;
                transformedImage.style.display = 'block';
                transformedImagePlaceholder.style.display = 'none'; 
            } else {
                throw new Error("Backend did not return a valid image URL.");
            }
            setLoading(false); 
        } catch (error) {
            console.error('An error occurred:', error);
            generatedPrompt.textContent = `Error: ${error.message}`;
            alert(`An error occurred: ${error.message}`);
            transformedImage.style.display = 'none';
            transformedImagePlaceholder.style.display = 'flex';
            setLoading(false); 
        }
    }
    
    function setLoading(isLoading) {
        generateButton.disabled = isLoading;
        uploadButton.disabled = isLoading;
        if (isLoading) {
            loader.style.display = 'flex';
            transformedImage.style.display = 'none';
            transformedImagePlaceholder.style.display = 'none';
        } else {
            loader.style.display = 'none';
        }
    }
    
    async function fetchFromBackend(endpoint, body) {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'An unknown error occurred on the server.');
        }
        return data;
    }
});

