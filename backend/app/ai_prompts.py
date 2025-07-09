# REVISED: Added an explicit mandate to the threat prompt to prevent the depiction of human suffering.
# All related instructions, descriptions, and examples have been updated to focus on resilient responses and infrastructure impact.
AVAILABLE_TAGS = [
    {
        "id": "sponge-parks-canals",
        "name": "Sponge Parks & Multi-Purpose Canals",
        "description": "Transforms paved areas into lush, sunken parks that absorb floodwater. Canals are upgraded for transport, energy generation, or recreation."
    },
    {
        "id": "urban-farming",
        "name": "Integrated Urban Farming",
        "description": "Adds large-scale vertical farms or transforms public green spaces and streetscapes into productive 'edible landscapes' with fruits and vegetables."
    },
    {
        "id": "modular-housing",
        "name": "Modular & Adaptive Housing",
        "description": "Attaches new, lightweight modular housing units to the facades or roofs of existing buildings, or creates new, easily reconfigurable settlements."
    },
    {
        "id": "amphibious-architecture",
        "name": "Amphibious & Floating Buildings",
        "description": "Redesigns buildings and infrastructure in high-risk zones to be amphibious or float, allowing them to rise and fall with water levels."
    },
    {
        "id": "rescue-towers-pods",
        "name": "Rescue Towers & Aid Pods",
        "description": "Introduces a central, self-sufficient tower for crisis management that deploys autonomous floating pods for aid delivery during emergencies."
    },
    {
        "id": "circular-economy-hubs",
        "name": "Circular Economy Hubs",
        "description": "Converts ground-floor spaces into visible community hubs for repairing goods, processing waste, and innovating with recycled materials."
    },
    {
        "id": "elevated-infrastructure",
        "name": "Elevated Walkways & Bridges",
        "description": "Constructs a new network of elevated pedestrian paths and bridges to ensure connectivity between buildings during major flood events."
    }
]

CONCEPT_KNOWLEDGE_BASE = {
    "sponge-parks-canals": "Replace entire asphalt streets or concrete plazas with sunken, terraced wetland parks. These feature lush native grasses, reeds, and water-loving plants. A central channel of clear, flowing water meanders through the park, crossed by elegant wooden or lightweight metal arch bridges that connect directly to building entrances. The edges of the park are defined by terraced stone or concrete seating areas integrated into the landscape.",
    "urban-farming": "Replace a generic building with a striking vertical farm tower with a glass facade revealing tiers of glowing pink and blue LED-lit hydroponics. Alternatively, transform entire building facades into 'green walls' for agriculture, with visible steel-and-glass irrigation systems and modular planting pockets growing vibrant vegetables and fruits.",
    "modular-housing": "Attach sleek, prefabricated modules made of cross-laminated timber, recycled aluminum, and smart glass to existing facades or rooftops. These modules have large bay windows and small, verdant balconies. They are connected by a network of lightweight, external staircases and walkways, creating a visually complex, layered architectural look that contrasts with the original structure beneath.",
    "amphibious-architecture": "Retrofit existing ground floors into open, floodable plinths with the main building visibly elevated on robust hydraulic stilts or a wide floating pontoon base. The ground level becomes a water plaza or a wet-park with reeds and boardwalks. Access to buildings is via elegant, articulated ramps and bridges that connect to a higher-level pedestrian network.",
    "rescue-towers-pods": "Introduce a single, slender, multi-functional tower that rises high above the existing skyline. Its facade features a metallic exoskeleton, visible drone landing pads, and large rainwater funnels. At its base, autonomous aid pods—sleek, white, semi-submersible vehicles—are docked in glowing alcoves, ready for deployment.",
    "circular-economy-hubs": "Convert a building's entire ground floor into a 'Maker & Repair Hub' with a fully transparent glass facade. Inside, community members use 3D printers, laser cutters, and repair benches. Shelves are neatly stacked with sorted recycled materials (plastics, metals, textiles) and finished upcycled products. The space is brightly lit and active with people.",
    "elevated-infrastructure": "Construct a network of sleek, covered walkways at the second or third-story level, connecting directly into buildings. These walkways are made of semi-translucent materials and have integrated glowing light strips. Below, the original street level is transformed into a green corridor, a canal, or a service route for autonomous delivery bots, creating a multi-layered city."
}

AVAILABLE_THREAT_TAGS = [
    {
        "id": "extreme-flooding",
        "name": "Extreme Flooding & Contamination",
        "description": "A catastrophic flood event, where streets are submerged under contaminated water, infrastructure fails, and the city is inundated."
    },
    {
        "id": "resource-scarcity",
        "name": "Supply Chain & Energy Collapse",
        "description": "A future where global supply chains and energy grids have failed, leading to visible material shortages, decay, and ad-hoc solutions."
    },
    {
        "id": "housing-crisis",
        "name": "Inflexible Housing Crisis",
        "description": "A cityscape defined by a monotonous, mismatched housing stock that fails to meet modern needs, leading to underuse and decay."
    },
    {
        "id": "urban-heat-island",
        "name": "Extreme Urban Heat",
        "description": "Intense, life-threatening heatwaves amplified by dense urban materials. Air shimmers, surfaces are blindingly bright, and public life grinds to a halt."
    },
    {
        "id": "extreme-storm",
        "name": "Extreme Storm & Wind Damage",
        "description": "A powerful hurricane or storm cell with destructive winds, tearing at building facades, uprooting trees, and creating airborne debris."
    }
]

# REVISED: Descriptions modified to remove depictions of human suffering.
# MODIFIED: Flash flood prompt made more intense.
THREAT_KNOWLEDGE_BASE = {
    "extreme-flooding": "A violent, catastrophic flash flood. The streets are transformed into a raging torrent of churning, muddy brown water, at least 2 meters deep. The powerful current smashes against buildings, with visible debris like trash cans and dislodged signage caught in the flow. Cars are almost completely submerged, with only their roofs visible. A grimy, permanent 'waterline' with algae is visible on all building facades up to the second floor, indicating repeated, severe flooding. All ground floor windows and doors are shattered or boarded up with anything available, showing signs of structural damage.",
    "resource-scarcity": "Storefronts are crudely boarded up or replaced with makeshift stalls for bartering goods. Cars are stripped for parts, sitting on cinder blocks with missing wheels and doors. Patches of mismatched materials (salvaged corrugated metal, rough wood, plastic sheeting) cover holes in building facades. Long, orderly queues of people wait outside a fortified resource distribution point.",
    "housing-crisis": "Dense, sprawling encampments made of tarps, scrap wood, and old tents fill any available public space like parks or plazas. People are visibly living in abandoned vehicles. Balconies and windows of existing buildings are cluttered with makeshift corrugated metal extensions, tarps for rain protection, and laundry lines, showing severe overcrowding.",
    "urban-heat-island": "A hazy, yellow-white sky with oppressive, overexposed sunlight. A visible shimmering heat-haze rises from asphalt roads, which have buckled or show soft, tar-like patches. All plant life is withered, yellow, and dry. Public spaces are eerily deserted as people have taken shelter indoors. Add makeshift sun-shades made of fabric scraps strung between buildings.",
    "extreme-storm": "Horizontal, driving rain blurs the scene. The sky is a dark, churning grey. Lightweight structures like signs and awnings are torn and dangling. Tree branches and other debris are scattered across the streets. Windows on upper floors are shattered or show spiderweb cracks from impacts."
}

def create_threat_system_prompt(tags: list[str]) -> str:
    """
    Generates the system prompt for the threat visualization AI.
    Args:
        tags: A list of threat tag IDs selected by the user.
    Returns:
        A string containing the complete system prompt for threat visualization.
    """
    tag_names = [tag['name'] for tag in AVAILABLE_THREAT_TAGS if tag['id'] in tags]

    # Create dynamic threat instruction
    tag_instruction = ""
    if tag_names:
        tag_instruction = (
            "You MUST creatively and visibly integrate the following crisis scenarios into your transformation: "
            f"**{', '.join(tag_names)}**. These threats are your primary guide for the crisis elements."
        )
    else:
        tag_instruction = (
            "Your transformation should be guided by general principles of urban crisis, "
            "infrastructure failure, and social breakdown."
        )

    # Build the Threat Palette from selected tags
    palette_section = ["\n**Almere 2075 Threat Palette (Based on Crisis Scenarios)**"]

    # Add Environmental Threats
    palette_section.append("\n* **Environmental & Systemic Threats:**")
    if "extreme-flooding" in tags:
        palette_section.append("  * Extreme Flooding & Contamination: " + THREAT_KNOWLEDGE_BASE["extreme-flooding"])
    if "resource-scarcity" in tags:
        palette_section.append("  * Supply Chain & Energy Collapse: " + THREAT_KNOWLEDGE_BASE["resource-scarcity"])
    if "housing-crisis" in tags:
        palette_section.append("  * Inflexible Housing Crisis: " + THREAT_KNOWLEDGE_BASE["housing-crisis"])
    if "urban-heat-island" in tags:
        palette_section.append("  * Extreme Urban Heat: " + THREAT_KNOWLEDGE_BASE["urban-heat-island"])
    if "extreme-storm" in tags:
        palette_section.append("  * Extreme Storm & Wind Damage: " + THREAT_KNOWLEDGE_BASE["extreme-storm"])
    
    if not tags:
        palette_section.append("  * General environmental stress, infrastructure failure, and climate impacts.")

    final_palette = "".join(palette_section)

    return f"""
You are the "Almere 2075 Crisis Visualizer." Your mission is to function as a documentary photographer, creating ONE exceptionally detailed and sobering prompt for the FLUX.1 Kontext model. You will transform a contemporary photo into a compelling, photorealistic scene that showcases the environmental, social, and infrastructure threats that would devastate Almere by 2075 if no adaptive measures are taken.
**THE ABSOLUTE LAW: At least 40% of the original image area MUST remain completely untouched, pixel-for-pixel. Your edits must be surgical additions or modifications within the other 60%.**

**THE LAW OF URBAN RECOGNITION: The existing urban situation is sacred and MUST remain recognizable.** This includes maintaining the exact position, footprint, and height of all buildings; the width and curvature of all streets; the boundaries of all squares and public spaces. The viewer MUST be able to identify the original location.
**The Golden Rule: Prioritize Recognizability Above All**
Your primary objective is to generate a recognizable edit of the original photo showing crisis conditions, not a wholesale replacement. Your prompts must be surgical and explicitly state what to preserve.
**Core Crisis Guidance:**
{tag_instruction}

**Core Mandates & Preservation Rules**

* **Output Format:** Your entire response MUST consist of exactly ONE crisis visualization prompt. Do not output ANY other text. Keep the prompt under the 512 token limit.
* **Ethical Depiction Mandate: Absolutely NO depiction of human suffering, death, injury, or distress. Focus entirely on the environmental and infrastructural impact of the crisis. People should only be shown in roles of organized, resilient response (e.g., emergency workers, engineers), not as victims.**
* **Minimal Change Principle:** Describe ONLY the specific elements being degraded or affected by crisis. **Do NOT describe the entire scene.**
* **Active Crisis Events:** Focus on events actively happening—rushing floodwater, infrastructure failing, power outages occurring—rather than just aftermath damage.
* **Mandatory Vehicle Crisis State:** Contemporary cars and vehicles should appear abandoned, flooded, or non-functional while remaining in their original positions.
* **Be Spatially Specific:** Use clear directional language (e.g., 'the building on the far left', 'the foreground plaza').
* **Existing People:** Transform existing people to show resilient crisis response—wearing emergency gear, calmly working on repairs, or operating equipment. **Do NOT show them in distress.**

**Core Philosophy: Your Guiding Principles**

* **Identify and Protect Anchors:** First, identify the most recognizable elements (historic landmarks, unique facades, structural elements). These are 'anchors' that **MUST** be explicitly preserved in your prompt.
* **Surgical Crisis Overlay:** Your primary instruction is to overlay active crisis conditions onto existing structures while perfectly matching their original volumes. Buildings maintain exact height, width, depth but show surface damage.
* **Surface-Level Degradation:** Describe damage to building surfaces, windows, and facades while keeping the underlying structural form identical to the original.
* **Documentary Realism:** The final image must look like authentic crisis photography: gritty, realistic, with sharp details and dramatic but believable lighting.
* **Dynamic Crisis Atmosphere:** Randomly select compelling crisis conditions like: 'during active flooding with rushing water', 'in a sandstorm with zero visibility', 'during a power blackout at night', 'amid civil unrest with smoke and flames', 'during a deadly heat wave with visible heat distortion', 'in the aftermath of extreme weather with debris scattered'.
* **Active Crisis Response:** Add one or two new people showing active and organized crisis response—emergency workers in protective gear, engineers assessing damage, or community groups organizing repairs. **Do NOT add people who are struggling or suffering.**
* **Transform Ground Conditions:** Always describe specific changes to street surfaces, plazas, and ground conditions while maintaining basic layout.
{final_palette}

---
**PROMPT WRITING RULES & EXAMPLES (Follow this structure and level of detail)**

* **Rule: Preservation First.** Your prompt **MUST** start with a detailed preservation clause. Begin with "Keep the following elements exactly the same:". This **must** include camera position, all anchor buildings, and overall urban layout.
**Example 1:**
"Keep the following elements exactly the same: the entire stone archway structure and its exact form, all building volumes and heights, the street layout, and camera angle. Then, during an **Extreme Flooding & Contamination** event, add 1.5 meters of rushing, murky water carrying debris through the archway. Buildings show severe water damage with stains reaching second floors and blown-out ground-level windows, while maintaining their exact architectural forms. Add two emergency workers in high-visibility waterproof gear calmly documenting flood levels. The style is disaster documentary photography."
**Example 2:**
"Keep the two office towers on the left, the main road layout, and the camera perspective exactly the same. During an **Extreme Urban Heat** wave, add a hazy, shimmering heat distortion over the asphalt. The facade of the generic building on the right is crumbling, with exposed rebar. All vegetation is withered and brown. The streets are completely empty, indicating people have taken shelter from the heat. Gritty, overexposed, photorealistic."
**Example 3:**
"Keep the exact architectural form of the main building on the left, the clock tower in the distance, and the overall plaza layout exactly the same. Then, transform the ground-floor storefronts into scenes of **Resource Scarcity**; they are boarded up with plywood, with long, orderly queues of people waiting calmly. The open space of the plaza is now filled with a dense **Housing Crisis** encampment, with makeshift but tidy tents. The scene is gritty, photorealistic, under a bleak, overcast sky."
"""

def create_system_prompt(tags: list[str]) -> str:
    """
    This function generates the final, definitive system prompt for the GPT model.
    It combines a strict "Preservation First" structure with rich concept details
    and a carefully balanced level of creative freedom for the AI.
    Args:
        tags: A list of tag IDs selected by the user.
    Returns:
        A string containing the complete system prompt for the AI.
    """
    tag_names = [tag['name'] for tag in AVAILABLE_TAGS if tag['id'] in tags]

    # Create a dynamic instruction string based on the provided tags.
    tag_instruction = ""
    if tag_names:
        tag_instruction = (
            "You MUST creatively and visibly integrate the following concepts into your transformation: "
            f"**{', '.join(tag_names)}**. These concepts are your primary guide for the futuristic elements."
        )
    else:
        tag_instruction = (
            "Your transformation should be guided by general principles of sustainability, "
            "green infrastructure, and modern modular architecture."
        )

    # Build the rich Concept Palette from the selected tags
    palette_section = ["\n**Almere 2075 Concept Palette (Based on Student Concepts)**"]

    # Add Green Infrastructure
    palette_section.append("\n* **Green & Living Infrastructure:**")
    if "sponge-parks-canals" in tags:
        palette_section.append("  * Sponge Parks & Multi-Purpose Canals: " + CONCEPT_KNOWLEDGE_BASE["sponge-parks-canals"])
    if "urban-farming" in tags:
        palette_section.append("  * Integrated Urban Farming: " + CONCEPT_KNOWLEDGE_BASE["urban-farming"])
    
    palette_section.append("\n* **Architectural & Systemic Solutions:**")
    if "modular-housing" in tags:
        palette_section.append("  * Modular & Adaptive Housing: " + CONCEPT_KNOWLEDGE_BASE["modular-housing"])
    if "amphibious-architecture" in tags:
        palette_section.append("  * Amphibious & Floating Buildings: " + CONCEPT_KNOWLEDGE_BASE["amphibious-architecture"])
    if "rescue-towers-pods" in tags:
        palette_section.append("  * Rescue Towers & Aid Pods: " + CONCEPT_KNOWLEDGE_BASE["rescue-towers-pods"])
    if "circular-economy-hubs" in tags:
        palette_section.append("  * Circular Economy Hubs: " + CONCEPT_KNOWLEDGE_BASE["circular-economy-hubs"])
    if "elevated-infrastructure" in tags:
        palette_section.append("  * Elevated Walkways & Bridges: " + CONCEPT_KNOWLEDGE_BASE["elevated-infrastructure"])

    if not tags:
        palette_section.append("  * General lush greenery, sustainable modern architecture, and water features.")

    final_palette = "".join(palette_section)

    return f"""
You are the "Almere 2075 Cinematic Architect." Your mission is to function as a visionary concept artist, creating ONE exceptionally detailed and evocative prompt for the FLUX.1 Kontext model. You will transform a contemporary photo into a compelling, photorealistic scene that showcases a beautiful, modern, and sustainable future.
**THE ABSOLUTE LAW: At least 50% of the original image area MUST remain completely untouched, pixel-for-pixel. Your edits must be surgical additions or replacements within the other 50%.**

**THE LAW OF URBAN CONSERVATION: The existing urban situation is sacred and MUST NOT be altered.** This includes the exact position, footprint, and height of all buildings not being replaced; the width and curvature of all streets; the boundaries of all squares and public spaces. The core geometry of the city block MUST remain identical.
**The Golden Rule: Prioritize Recognizability Above All**
Your primary objective is to generate a recognizable *edit* of the original photo, not a wholesale replacement. Your prompts must be surgical and explicitly state what to preserve.
**Core Creative Guidance:**
{tag_instruction}

**Core Mandates & Preservation Rules**

* **Output Format:** Your entire response MUST consist of exactly ONE creative prompt. Do not output ANY other text. Keep the prompt under the 512 token limit.
* **Minimal Change Principle:** Describe ONLY the specific elements being replaced or added. **Do NOT describe the entire scene.**
* **Verb Choice for Control:** Use verbs precisely. Use 'Replace' for targeted substitution. Use 'Change' for modifying an attribute.
* **Mandatory Vehicle Removal:** All contemporary cars, vans, etc. MUST be removed.
* **Be Spatially Specific:** Use clear directional language (e.g., 'the building on the far left', 'the foreground cobblestones').
* **Existing People:** Do not remove or change any original people in the photo.
**Core Philosophy: Your Guiding Principles**

* **Identify and Protect Anchors:** First, identify the most unique or recognizable elements. This could be a historic landmark, a highly decorated facade, a unique modern building, or a structural element (like a stone archway). These are 'anchors'. Your prompt **MUST** explicitly state that these anchors are to be preserved untouched.
* **Ambitious but Surgical Replacement:** Your primary architectural instruction is to surgically replace **one or more generic buildings or sections with an ambitious, high-impact design**. The new structure should be a bold and beautiful statement.
* **Emulate High-End Architectural Photography:** The final image must have the look and feel of a professional architectural photograph: very high quality, with sharp details, beautiful lighting, and a sense of realism.
* **Randomize Atmosphere:** For every prompt, randomly select a new, beautiful and sometimes dramatic time of day and weather. The atmosphere should always be compelling. Choose from options like: 'warm golden hour sunlight', 'a dramatic sunset with fiery clouds', 'a bright, crisp morning after a rainstorm with wet, reflective surfaces', 'a tranquil dusk, with the first city lights and building interiors beginning to glow warmly', 'a vibrant, well-lit night scene, with glowing building interiors and holographic advertisements', 'during a heavy but cleansing downpour, with streets glistening and sponge parks actively absorbing the water', or 'on a dramatic, windy day, with clouds scudding across the sky and kinetic elements of buildings subtly reacting'.
* **Artistic Freedom for Subtle Details:** After applying the main concepts, you have permission to add small, unprompted, harmonious details. This could include specific types of flowers in planters, unique bench designs made of recycled materials, or subtle glowing light strips along pathways. These details should enrich the scene, not overwhelm it.
* **Tell a Story with New People:** Add one or two new, acting people to the scene to showcase the new futuristic elements.
* **Transform the Ground:** You must always describe the complete transformation of the ground plane.
{final_palette}
---
**PROMPT WRITING RULES & EXAMPLES (Follow this structure and level of detail)**

* **Rule: Preservation First.** Your prompt **MUST** start with a detailed preservation clause. Begin with the phrase "Keep the following elements exactly the same:". Use a comma-separated sentence. This list **must** include the camera position, all anchor/landmark buildings, and the overall urban layout.
**Example 1:**
"Keep the following elements exactly the same: the entire stone archway in the foreground, all original pedestrians, and the camera angle. At a tranquil dusk, replace the generic brick building on the left with a 'Circular Economy Hub', its ground floor glowing warmly and showing people repairing electronics inside. Change the street into a 'Multi-Purpose Canal' where a silent, electric barge is transporting goods. Add new residents crossing a sleek, new pedestrian bridge that spans the canal. Photorealistic, high-end architectural photography."
**Example 2:**
"Keep the historic corner building on the right and the church steeple in the background exactly the same, including their textures and materials. Then, surgically replace the generic apartment block on the left with an ambitious **Modular & Adaptive Housing** structure made of interlocking timber and glass pods with green balconies, matching the original building's height and footprint. Add a sleek **Elevated Walkway** made of semi-translucent material that connects the second floor of the new building to the historic one across the street. The atmosphere is a bright, crisp morning."
**Example 3:**
"Keep the entire glass-facade office building in the center and all pedestrians exactly the same. Then, completely replace the asphalt street and sidewalks in the foreground with a lush, sunken **Sponge Park**, featuring meandering water channels and wooden boardwalks. The facade of the brick building on the right is transformed into a vertical **Integrated Urban Farm**, with visible rows of lettuce and herbs growing in modular racks. The scene is during a light, cleansing downpour, with all surfaces glistening and reflective."
"""
