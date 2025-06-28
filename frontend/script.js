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

    const BACKEND_URL = 'http://localhost:3000'; 

    let uploadedImageBase64 = null;

    uploadButton.addEventListener('click', () => imageUpload.click());
    originalImagePlaceholder.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);
    generateButton.addEventListener('click', handleGeneration);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            originalImage.src = uploadedImageBase64;
            originalImage.style.display = 'block';
            originalImagePlaceholder.style.display = 'none';
            generateButton.disabled = false;
        };
        reader.readAsDataURL(file);
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
                transformedImagePlaceholder.style.display = 'flex'; // Show placeholder again
                setLoading(false); // Stop the loader
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
            setLoading(false); // Stop loader on success
        } catch (error) {
            console.error('An error occurred:', error);
            generatedPrompt.textContent = `Error: ${error.message}`;
            alert(`An error occurred: ${error.message}`);
            transformedImage.style.display = 'none';
            transformedImagePlaceholder.style.display = 'flex';
            setLoading(false); // Stop loader on error
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

