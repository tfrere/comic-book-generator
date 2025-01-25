
CINEMATIC_SYSTEM_PROMPT = """
3. Generate 1 to 3 comic panels based on narrative needs:
   
   NARRATIVE TECHNIQUES:
   - Use 1 panel for: 
     * A powerful singular moment
     * An impactful revelation
     * A dramatic pause
   
   - Use 2 panels for:
     * Cause and effect
     * Action and reaction
     * Before and after
     * Shot/reverse shot (character POV vs what they see)
     * Tension building (wide shot then detail)
   
   - Use 3 panels for:
     * Complete story beats (setup/conflict/resolution)
     * Progressive reveals
     * Multiple simultaneous actions
     * Environmental storytelling sequences
   
   SHOT VALUES:
   - Extreme Close-Up (ECU): 
     * Eyes, small objects
     * Extreme emotional moments
     * Critical details (detector readings)
   
   - Close-Up (CU):
     * Face and expressions
     * Important objects
     * Emotional impact
   
   - Medium Close-Up (MCU):
     * Head and shoulders
     * Dialogue moments
     * Character reactions
   
   - Medium Shot (MS):
     * Character from knees up
     * Action and movement
     * Character interactions
   
   - Medium Long Shot (MLS):
     * Full character
     * Immediate environment
     * Physical action
   
   - Long Shot (LS):
     * Character in environment
     * Establishing location
     * Movement through space
   
   - Very Long Shot (VLS):
     * Epic landscapes
     * Environmental storytelling
     * Character isolation
   
   ANGLES AND MOVEMENT:
   - High angle: Vulnerability, weakness
   - Low angle: Power, threat
   - Dutch angle: Tension, disorientation
   - Over shoulder: POV, surveillance
   
   VISUAL STORYTELLING TOOLS:
   - Focus on story-relevant details:
     * Objects that will be important later
     * Environmental clues
     * Character reactions
     * Symbolic elements
   
   - Dynamic composition:
     * Frame within frame (through doorways, windows)
     * Reflections and shadows
     * Foreground elements for depth
     * Leading lines
     * Rule of thirds

   IMAGE PROMPT FORMAT:
   Each panel must follow this EXACT format:
   "[shot value] [scene description], french comic panel"
   
   Rules for scene description:
   - Maximum 20 words
   - No superfluous adjectives
   - Capture only the main action
   - Include shot value (ECU, CU, MS, etc.)
   - Focus on dramatic moments
   
   EXAMPLE SEQUENCES:
   
   Single powerful moment:
   - "ECU radiation detector needle swings violently into pulsing red danger zone"
   
   Shot/reverse shot:
   - "MS Sarah crouches tensely behind crumbling concrete wall peering through broken window"
   - "POV through shattered glass raiders gather around burning barrel in snow-covered ruins"
   
   Progressive reveal:
   - "VLS massive steel bunker door stands half-open in barren windswept wasteland"
   - "CU fresh bloody handprints smear down rusted metal wall beside flickering emergency light"
   - "dutch-angle LS twisted corpse sprawled among scattered medical supplies casting long shadows"
   
   Environmental storytelling:
   - "LS Sarah's silhouette dwarfed by towering ruins against blood-red sunset sky"
   - "MCU radiation detector screen flickers warning through heavy falling radioactive snow"
   - "ECU Sarah's trembling hands clutch last remaining water bottle in dim bunker light"
"""
