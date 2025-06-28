// backend/server.js (Switched to gpt-4-turbo for better stability)

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const Replicate = require('replicate');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY,
});

const systemPromptForFlux = `
You are the "Almere 2075 Cinematic Architect." Your mission is to function as a visionary concept artist, creating ONE exceptionally detailed, evocative, and ambitious prompt for the FLUX.1 Kontext model. You will transform a contemporary photo of Almere into a compelling, photorealistic scene that showcases the beautiful, modern, and sustainable future envisioned in the Almere 2075 student projects. Your focus is on creating a single, stunning frame that tells a rich story about life in this new city.
**Core Mandates & Preservation Rules:**
- Your entire response MUST consist of exactly ONE creative prompt. Do not output ANY other text, preamble, or explanation.
- Preserve the Scene's Core: You must meticulously maintain the original photo's Camera Position & Angle, Time of Day, Weather, and Lighting.
- Existing People: Do not remove or change any of the original people in the photo.
**Core Philosophy: Your Guiding Principles:**
- Create a Lively Architectural Photograph: Your target style is high-end architectural photography, full of life. It must look like a real, professionally captured photograph, not a sterile render.
- Use descriptive language to achieve this: "captured with a high-detail professional camera," "crisp focus," "natural and realistic lighting," "rich textures of materials like timber and stone."
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

---
**Fallback Instruction:** If you cannot process the user's image for any reason (e.g., it violates a safety policy or is irrelevant), DO NOT give a generic refusal like "I'm sorry...". Instead, you MUST respond with a clear, user-friendly message explaining the potential issue in a single sentence. For example: "The provided image could not be processed, possibly due to its content. Please try a different image."
`;

app.post('/generate-prompt', async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Image data is required.' });

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                // FIX: Switched to gpt-4-turbo for better stability with this task
                model: "gpt-4.1-2025-04-14",
                messages: [{ role: "system", content: systemPromptForFlux }, { role: "user", content: [{ type: "text", text: "Generate a prompt for the following image:" }, { type: "image_url", image_url: { "url": imageBase64 } }] }],
                max_tokens: 300
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error.message); }
        const data = await response.json();
        
        let promptContent = data.choices[0].message.content;
        try {
            const parsed = JSON.parse(promptContent);
            if (parsed && parsed.prompt) {
                promptContent = parsed.prompt;
            }
        } catch (e) {
            // It's not a JSON string, so we use it as is.
        }
        promptContent = promptContent.replace(/\*\*/g, '');

        res.json({ prompt: promptContent });
    } catch (error) { res.status(500).json({ error: `OpenAI Error: ${error.message}` }); }
});

app.post('/transform-image', async (req, res) => {
    const { imageBase64, prompt } = req.body;
    if (!imageBase64 || !prompt) return res.status(400).json({ error: 'Image and prompt are required.' });

    try {
        const modelVersion = "black-forest-labs/flux-kontext-pro";
        const output = await replicate.run(modelVersion, {
            input: {
                prompt: prompt,
                input_image: imageBase64
            }
        });
        
        console.log("--- Received output from Replicate ---");
        console.log(output);
        console.log("------------------------------------");

        let imageUrl = null;
        if (Array.isArray(output) && output.length > 0) {
            imageUrl = output[0];
        } else if (typeof output === 'string') {
            imageUrl = output;
        }

        if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
             throw new Error(`Model returned an invalid output. Expected a URL string, but got: ${imageUrl}`);
        }
        
        res.json({ transformedImageUrl: imageUrl });

    } catch (error) {
        console.error("--- DETAILED REPLICATE ERROR ---");
        console.error(error);
        console.error("--------------------------------");
        res.status(500).json({ error: `Replicate Error: ${error.message}` });
    }
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));

