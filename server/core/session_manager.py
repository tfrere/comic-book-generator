from typing import Dict
import time
from .game_logic import GameState

class SessionManager:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            print("Creating new SessionManager instance")
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, session_timeout: int = 3600):
        if not self._initialized:
            print("Initializing SessionManager singleton")
            self.sessions: Dict[str, GameState] = {}
            self.last_activity: Dict[str, float] = {}
            self.session_timeout = session_timeout
            self._initialized = True
    
    def create_session(self, session_id: str, game_state: GameState = None):
        """Create a new game session.
        
        Args:
            session_id (str): Unique identifier for the session
            game_state (GameState): Optional initial game state
            
        Returns:
            GameState: The newly created game state
        """
        print(f"Creating session {session_id} in SessionManager singleton")
        if game_state is None:
            game_state = GameState()
        self.sessions[session_id] = game_state
        self.last_activity[session_id] = time.time()
        print(f"Current sessions in SessionManager: {list(self.sessions.keys())}")
        return game_state
    
    def get_session(self, session_id: str) -> GameState | None:
        """Get an existing session if it exists and is not expired.
        
        Args:
            session_id (str): Session identifier
            
        Returns:
            GameState | None: The game state if found and not expired, None otherwise
        """
        print(f"Getting session {session_id} from SessionManager singleton")
        print(f"Current sessions in SessionManager: {list(self.sessions.keys())}")
        
        if session_id in self.sessions:
            # Check if session has expired
            if time.time() - self.last_activity[session_id] > self.session_timeout:
                print(f"Session {session_id} has expired")
                self.cleanup_session(session_id)
                return None
            
            # Update last activity time
            self.last_activity[session_id] = time.time()
            print(f"Session {session_id} found and active")
            return self.sessions[session_id]
            
        print(f"Session {session_id} not found")
        return None
    
    def cleanup_session(self, session_id: str):
        """Remove a specified session.
        
        Args:
            session_id (str): Session identifier to cleanup
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            del self.last_activity[session_id]
    
    def cleanup_expired_sessions(self):
        """Clean up all expired sessions."""
        current_time = time.time()
        expired_sessions = [
            session_id for session_id, last_activity in self.last_activity.items()
            if current_time - last_activity > self.session_timeout
        ]
        for session_id in expired_sessions:
            self.cleanup_session(session_id)
    
    def get_or_create_session(self, session_id: str) -> GameState:
        """Get an existing session or create a new one if it doesn't exist.
        
        Args:
            session_id (str): Session identifier
            
        Returns:
            GameState: The existing or newly created game state
        """
        session = self.get_session(session_id)
        if session is None:
            session = self.create_session(session_id)
        return session 

    def delete_session(self, session_id: str):
        """Supprime une session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            del self.last_activity[session_id] 