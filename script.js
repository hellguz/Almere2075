document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUpload = document.getElementById('image-upload');
    const uploadButton = document.getElementById('upload-button');
    const generateButton = document.getElementById('generate-button');
    const originalImage = document.getElementById('original-image');
    const transformedImage = document.getElementById('transformed-image');
    const generatedPrompt = document.getElementById('generated-prompt');
    const openAIApiKeyInput = document.getElementById('openai-api-key');
    const replicateApiKeyInput = document.getElementById('replicate-api-key');
    const loader = document.getElementById('loader');
    const transformedCard = document.getElementById('transformed-card');

    let uploadedImageBase64 = null;

    // --- Persona and Prompt for the AI ---
    const systemPromptForFlux = `
You are the "Almere 2075 Cinematic Architect." Your mission is to function as a visionary concept artist, creating ONE exceptionally detailed, evocative, and ambitious prompt for the FLUX.1 Kontext model. You will transform a contemporary photo of Almere into a compelling, photorealistic scene that showcases the beautiful, modern, and sustainable future envisioned in the Almere 2075 student projects. Your focus is on creating a single, stunning frame that tells a rich story about life in this new city.

**Core Mandates & Preservation Rules:**
- Your entire response MUST consist of exactly ONE creative prompt. Do not output ANY other text, preamble, or explanation.
- Preserve the Scene's Core: You must meticulously maintain the original photo's Camera Position & Angle, Time of Day, Weather, and Lighting.
- Existing People: Do not remove or change any of the original people in the photo.

**Core Philosophy: Your Guiding Principles:**
- Create a Lively Architectural Photograph: Your target style is high-end architectural photography, full of life. It must look like a real, professionally captured photograph, not a sterile render. Use descriptive language to achieve this: "captured with a high-detail professional camera," "crisp focus," "natural and realistic lighting," "rich textures of materials like timber and stone."
- Tell a Story with New People: You should add one or two new, acting people to the scene to make it feel alive. Describe their specific, playful, or interesting actions that connect them to the new futuristic elements and tell a story.
- The Green Imperative: Every prompt you generate MUST feature significant and visible green/living infrastructure from the Concept Palette. Almere in 2075 is fundamentally a green city.
- Context is King: You MUST analyze the input image's context (e.g., dense street, residential hill) and choose an architectural typology from the Palette that is appropriate. Do not default to the same solution for every prompt. Show architectural variety.

**The Core Transformation Rule (The Key to Recognizability):**
- Replace by Volume: Your primary architectural instruction is to replace existing buildings with new, modern structures. However, the new building MUST strictly follow the original building's volumetric form (its 3D footprint, height, and overall massing). The architectural style will be completely new, but it will occupy the exact same space as the old, anchoring the scene.
- Transform the Ground: You must always describe the complete transformation of the ground plane (the street, sidewalk, or square) using a concept from the palette (e.g., Sponge Park, canal).

**Almere 2075 Concept Palette (Your Architectural & Narrative Library):**
- **Architectural Typologies:** Kinetic Timber & Glass Residences, Modular Pod Housing, Amphibious/Plinth Buildings, Living Bioreactor Facades, Community Repair Hubs.
- **Green & Living Infrastructure:** Sponge Parks, Rooftop Greenhouses, Edible Streetscapes, Cascading Water Features.
- **Technology & Narrative Elements:** Elevated Mobility Systems, Autonomous Delivery Drones & Robotic Assistants, Autonomous Water Transport.

Based on the user's image, generate one single, direct prompt for the image model.
`;

    // --- API Key Management ---
    const loadApiKeys = () => {
        const openAIKey = localStorage.getItem('openaiApiKey');
        const replicateKey = localStorage.getItem('replicateApiKey');
        if (openAIKey) openAIApiKeyInput.value = openAIKey;
        if (replicateKey) replicateApiKeyInput.value = replicateKey;
    };

    const saveApiKeys = () => {
        localStorage.setItem('openaiApiKey', openAIApiKeyInput.value);
        localStorage.setItem('replicateApiKey', replicateApiKeyInput.value);
    };

    openAIApiKeyInput.addEventListener('input', saveApiKeys);
    replicateApiKeyInput.addEventListener('input', saveApiKeys);

    // --- Event Listeners ---
    uploadButton.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);
    generateButton.addEventListener('click', handleGeneration);

    // --- Functions ---
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            uploadedImageBase64 = e.target.result;
            generateButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    async function handleGeneration() {
        if (!uploadedImageBase64) {
            alert('Please upload an image first.');
            return;
        }

        const openAIApiKey = openAIApiKeyInput.value.trim();
        const replicateApiKey = replicateApiKeyInput.value.trim();

        if (!openAIApiKey || !replicateApiKey) {
            alert('Please enter both OpenAI and Replicate API keys.');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Generate prompt with OpenAI
            generatedPrompt.textContent = 'Generating prompt with AI...';
            const fluxPrompt = await generateFluxPrompt(openAIApiKey, uploadedImageBase64);
            generatedPrompt.textContent = fluxPrompt;

            // Step 2: Transform image with Replicate
            const transformedImageUrl = await transformImageWithReplicate(replicateApiKey, uploadedImageBase64, fluxPrompt);
            transformedImage.src = transformedImageUrl;
            transformedImage.style.display = 'block';

        } catch (error) {
            console.error('An error occurred:', error);
            alert(`An error occurred: ${error.message}`);
            generatedPrompt.textContent = 'Failed to generate. Please check the console for details.';
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        generateButton.disabled = isLoading;
        loader.style.display = isLoading ? 'flex' : 'none';
        
        if(isLoading) {
            transformedImage.style.display = 'none';
        }
    }

    async function generateFluxPrompt(apiKey, imageBase64) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{
                    role: "system",
                    content: systemPromptForFlux
                }, {
                    role: "user",
                    content: [{
                        type: "text",
                        text: "Generate a prompt for the following image:"
                    }, {
                        type: "image_url",
                        image_url: {
                            "url": imageBase64
                        }
                    }]
                }],
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async function transformImageWithReplicate(apiKey, imageBase64, prompt) {
        // Initial request to start the prediction
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "255554f217897a51351dea11c79895c18471e84776100c43666d33346f001b63", // black-forest-labs/flux-kontext-pro model version
                input: {
                    prompt: prompt,
                    input_image: imageBase64,
                    output_format: 'jpg'
                },
            }),
        });

        let prediction = await startResponse.json();
        if (startResponse.status !== 201) {
            throw new Error(`Replicate API Error: ${prediction.detail}`);
        }

        // Poll for the result
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                headers: {
                    "Authorization": `Token ${apiKey}`,
                    "Content-Type": "application/json",
                },
            });
            prediction = await pollResponse.json();
            if (pollResponse.status !== 200) {
                 throw new Error(`Replicate API Error while polling: ${prediction.detail}`);
            }
        }

        if (prediction.status === "failed") {
             throw new Error(`Replicate prediction failed: ${prediction.error}`);
        }

        return prediction.output[0];
    }
    
    // Initial Load
    loadApiKeys();
});