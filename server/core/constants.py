class GameConfig:
    # Game state constants
    MAX_RADIATION = 12
    STARTING_TIME = "18:00"
    STARTING_LOCATION = "Home"
    
    # Story constraints
    MIN_PANELS = 1
    MAX_PANELS = 4
    
    # Default values
    DEFAULT_RADIATION_INCREASE = 1
    
    # Story progression
    STORY_BEAT_INTRO = 0
    STORY_BEAT_EARLY_GAME = 1
    STORY_BEAT_MID_GAME = 3
    STORY_BEAT_LATE_GAME = 5 