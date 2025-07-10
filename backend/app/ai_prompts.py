# REVISED: Integrated user's preferred prompt settings for a brighter, more optimistic atmosphere.
# Added stricter rules for architecture style and weather conditions.
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
        "description": "Attaches new, lightweight modular housing units to the facades of existing buildings, creating a layered, revitalized look."
    },
    {
        "id": "amphibious-architecture",
        "name": "Amphibious & Floating Buildings",
        "description": "Redesigns buildings and infrastructure in high-risk zones to be amphibious or float, allowing them to rise and fall with water levels."
    },
    {
        "id": "urban-survival-tower",
        "name": "Urban Survival Tower",
        "description": "A central, self-sufficient lattice tower that deploys autonomous, solar-powered pods for emergency aid (food, healthcare) and daily city functions."
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
    },
    {
        "id": "vertical-densification",
        "name": "Vertical Densification",
        "description": "Adds new, lightweight modular floors on top of existing buildings or constructs new, slender residential towers on underused land."
    }
]

CONCEPT_KNOWLEDGE_BASE = {
    "sponge-parks-canals": "Replace entire asphalt streets or concrete plazas with deep, sunken, lush green parks with a healthy, dense mix of various native Dutch grasses and wildflowers. These feature terraced landscaping and small, crystal-clear water channels. Elegant wooden boardwalks or stone paths crisscross the green areas.",
    "urban-farming": "Elegant, slender towers with glass facades revealing glowing hydroponic and aquaponic systems inside. Integrated near residential clusters, some with visible sky-bridges connecting them to other buildings for food distribution. They are architecturally striking and emit a soft, pleasant light. Where possible, asphalt streets and sidewalks are completely removed and replaced with fertile soil for ground-level community gardens and crops.",
    "modular-housing": "Attach sleek, modern housing modules made of sustainable materials like cross-laminated timber (CLT) and recycled metal with a polished finish to existing building facades. They feature integrated balconies with blooming flowers and small herb planters, green walls, and large smart-glass windows.",
    "amphibious-architecture": "Retrofit existing ground floors into open, floodable plinths with the main building visibly elevated on robust hydraulic stilts or a wide floating pontoon base. Add beautiful floating platforms made of light wood for cafes or social gatherings. Buildings are connected by lightweight, intricate bridges.",
    "urban-survival-tower": "Introduce a single, tall, and slender 'Urban Survival Tower' with a complex structural lattice frame made of wood or weathered steel. The tower is covered in spherical, pod-like, truncated octahedron modules with integrated solar panels. These pods dock at various points along the tower's height. Some pods are shown autonomously flying or floating away from the tower, suggesting deployment for emergency aid (healthcare, nutrition, waste collection). The tower itself integrates air cleaning systems, rainwater collectors, and vertical greenery within its structure.",
    "circular-economy-hubs": "Convert a building's entire ground floor into a clean, open-front workshop for repairing electronics, furniture, or textiles, visible behind large glass walls. Small-scale 3D printing labs and material recycling stations are brightly lit and inviting spaces for making and learning.",
    "elevated-infrastructure": "Construct a network of sleek, covered walkways at the second or third-story level, connecting directly into buildings. These walkways are made of semi-translucent materials and have integrated glowing light strips. Below, the original street level is transformed into a green corridor, a canal, or a service route for autonomous delivery bots, creating a multi-layered city.",
    "vertical-densification": "Surgically add several new floors on top of existing buildings using modern, lightweight modular construction systems like cross-laminated timber (CLT) and sleek, recycled aluminum panels. These new levels must look modern and optimistic, with different, high-tech facades from the host building below. Alternatively, construct new, slender residential towers on vacant lots, featuring extensive use of timber, green balconies, and smart glass."
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

THREAT_KNOWLEDGE_BASE = {
    "extreme-flooding": "A violent, catastrophic flash flood. The streets are transformed into a raging torrent of churning, muddy brown water, at least 2 meters deep. The powerful current smashes against buildings, with visible floating debris like metal sheets, roof pieces, branches, and other refuse caught in the flow. Cars are almost completely submerged, with only their roofs visible. A grimy, permanent 'waterline' with algae is visible on all building facades up to the second floor, indicating repeated, severe flooding. All ground floor windows and doors are shattered or boarded up with anything available, showing signs of structural damage.",
    "resource-scarcity": "A city in a state of decay due to infrastructure collapse. Asphalt roads are severely cracked, buckled, and littered with potholes. Building facades are crumbling, with exposed rebar and patches of mismatched materials (salvaged corrugated metal, rough wood) covering holes. Storefronts are crudely boarded up. The general impression is one of widespread disrepair and neglect.",
    "housing-crisis": "Dense, sprawling encampments made of tarps, scrap wood, and old tents fill any available public space like parks or plazas. People are visibly living in abandoned vehicles. Balconies and windows of existing buildings are cluttered with makeshift corrugated metal extensions, tarps for rain protection, and laundry lines, showing severe overcrowding.",
    "urban-heat-island": "A hazy, yellow-brown smog hangs in the air, with the sun appearing as a pale, oppressive disc. A visible shimmering heat-haze rises from asphalt roads. All plant life is withered and yellow. The few people visible are hurrying, dressed in lightweight, loose-fitting clothes, some carrying umbrellas for shade. In the distance, a plume of dark smoke rises from the horizon, suggesting a fire.",
    "extreme-storm": "Horizontal, driving rain blurs the scene under a dark, churning grey sky. A brilliant fork of lightning cracks across the sky. Lightweight structures like signs and awnings are torn and dangling. Lightweight debris like plastic bags, leaves, and small objects are seen flying through the air, caught in the powerful wind. Heavier debris like tree branches, loose roof tiles, cars, windows, and trash bins are scattered across all streets and open areas."
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
    palette_section = ["\n**Almere 2075 Threat Palette (Based on Crisis Scenarios)**"]
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
**Example 1:** "Keep the following elements exactly the same: the entire stone archway structure and its exact form, all building volumes and heights, the street layout, and camera angle. Then, during an **Extreme Flooding & Contamination** event, add 1.5 meters of rushing, murky water carrying debris through the archway. Buildings show severe water damage with stains reaching second floors and blown-out ground-level windows, while maintaining their exact architectural forms. Add two emergency workers in high-visibility waterproof gear calmly documenting flood levels. The style is disaster documentary photography."
**Example 2:** "Keep the two office towers on the left, the main road layout, and the camera perspective exactly the same. During an **Extreme Urban Heat** wave, add a hazy, shimmering heat distortion over the asphalt. The facade of the generic building on the right is crumbling, with exposed rebar. All vegetation is withered and brown. The streets are completely empty, indicating people have taken shelter from the heat. Gritty, overexposed, photorealistic."
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
    palette_section = ["\n**Almere 2075 Concept Palette (Based on Student Concepts)**"]
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
    if "urban-survival-tower" in tags:
        palette_section.append("  * Urban Survival Tower: " + CONCEPT_KNOWLEDGE_BASE["urban-survival-tower"])
    if "circular-economy-hubs" in tags:
        palette_section.append("  * Circular Economy Hubs: " + CONCEPT_KNOWLEDGE_BASE["circular-economy-hubs"])
    if "elevated-infrastructure" in tags:
        palette_section.append("  * Elevated Walkways & Bridges: " + CONCEPT_KNOWLEDGE_BASE["elevated-infrastructure"])
    if "vertical-densification" in tags:
        palette_section.append("  * Vertical Densification: " + CONCEPT_KNOWLEDGE_BASE["vertical-densification"])
    if not tags:
        palette_section.append("  * General lush greenery, sustainable modern architecture, and water features.")
    final_palette = "".join(palette_section)
    return f"""
You are the "Almere 2075 Cinematic Architect." Your mission is to function as a visionary concept artist, creating ONE exceptionally detailed and evocative prompt for the FLUX.1 Kontext model. You will transform a contemporary photo into a compelling, photorealistic scene that showcases a beautiful, modern, and sustainable future.

**THE ABSOLUTE LAW: At least 50% of the original image area MUST remain completely untouched, pixel-for-pixel. Your edits must be surgical additions or modifications within the other 50%.**

**THE LAW OF URBAN RECOGNITION: The existing urban situation is sacred and MUST remain recognizable.** This includes maintaining the exact position, footprint, and height of all buildings not being replaced; the width and curvature of all streets; the boundaries of all squares and public spaces. The core geometry of the city block MUST remain identical.

**The Golden Rule: Prioritize Recognizability Above All**
Your primary objective is to generate a prompt that results in a recognizable *edit* of the original photo, not a wholesale replacement.

**Core Creative Guidance:**
{tag_instruction}

**Core Philosophy & Mandates**

* **Transformation Principle:** Your goal is to **surgically modify** the input image. You will **ADD** new elements like timber facades onto existing buildings, or **TRANSFORM** ground surfaces like asphalt into parks. **AVOID replacing entire buildings.** Think of it as a renovation or addition, not a demolition.
* **Identify and Protect Anchors:** First, identify the most recognizable elements (historic landmarks, unique facades, structural elements). These are 'anchors'. Your prompt **MUST** explicitly state that these anchors are to be preserved untouched.
* **Minimal Change Principle:** Describe ONLY the specific elements being transformed or added. **Do NOT describe the entire scene.**
* **Architectural Style:** The new architecture must be modern, sleek, and optimistic. Heavily favor lightweight structures, **cross-laminated timber (CLT)**, smart glass, and green facades. **AVOID brutalist, monolithic concrete styles.**
* **Atmosphere Mandate:** Your atmosphere **MUST be a bright, optimistic daytime or beautiful twilight (dawn, golden hour, sunset) scene.** **NEVER generate a dark, rainy, or gloomy atmosphere for the solution.** The image should be bright and saturated. Choose from options like: 'warm golden hour sunlight', 'a dramatic sunset with fiery clouds', 'a bright, crisp morning after a rainstorm with wet, reflective surfaces', 'a tranquil dusk with the first city lights glowing warmly', 'a clear, sunny midday with sharp shadows', or 'an beautiful overcast day with soft, diffused light'.
* **Be Spatially Specific:** Use clear directional language (e.g., 'the building on the far left', 'the foreground cobblestones').
* **Mandatory Vehicle Removal:** All contemporary cars, vans, etc. MUST be removed.
* **Output Format:** Your entire response MUST consist of exactly ONE creative prompt. Do not output ANY other text. Keep the prompt under the 512 token limit.
{final_palette}
---
**PROMPT WRITING RULES & EXAMPLES (Follow this structure and level of detail)**

* **Rule: Preservation First.** Your prompt **MUST** start with a detailed preservation clause. Begin with the phrase "Keep the following elements exactly the same:". This list **must** include the camera position, all anchor/landmark buildings, and the overall urban layout.

**Example 1:**
"Keep the following elements exactly the same: the entire stone archway in the foreground, all original pedestrians, and the camera angle. Then, during a warm golden hour, **transform** the street into a 'Multi-Purpose Canal' where a silent, electric barge is transporting goods. **Add** a 'Circular Economy Hub' to the ground floor of the generic brick building on the left, its interior glowing warmly and showing people repairing electronics. Photorealistic, high-end architectural photography."

**Example 2:**
"Keep the historic corner building on the right and the church steeple in the background exactly the same, including their textures and materials. Then, on a bright, crisp morning, **add** an ambitious 'Modular & Adaptive Housing' structure onto the facade and roof of the generic apartment block on the left, using interlocking timber and glass pods with green balconies. It must match the original building's height and footprint. **Add** a sleek 'Elevated Walkway' made of semi-translucent material that connects the second floor of the new structure to the historic one across the street."
"""
