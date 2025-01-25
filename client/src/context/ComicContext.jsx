import { createContext, useContext, useReducer } from "react";
import { groupSegmentsIntoLayouts } from "../layouts/utils";

const ComicContext = createContext();

const initialState = {
  segments: [],
  currentChoices: [],
  isLoading: false,
  pendingImages: new Set(),
};

function comicReducer(state, action) {
  switch (action.type) {
    case "UPDATE_SEGMENTS":
      return {
        ...state,
        segments: action.payload,
      };

    case "UPDATE_SEGMENT":
      return {
        ...state,
        segments: state.segments.map((segment, index) =>
          index === action.payload.index ? action.payload.segment : segment
        ),
      };

    case "SET_CHOICES":
      return {
        ...state,
        currentChoices: action.payload,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
}

export function ComicProvider({ children }) {
  const [state, dispatch] = useReducer(comicReducer, initialState);

  const updateSegments = (segments) => {
    dispatch({ type: "UPDATE_SEGMENTS", payload: segments });
  };

  const updateSegment = (index, segment) => {
    dispatch({ type: "UPDATE_SEGMENT", payload: { index, segment } });
  };

  const setChoices = (choices) => {
    dispatch({ type: "SET_CHOICES", payload: choices });
  };

  const setLoading = (isLoading) => {
    dispatch({ type: "SET_LOADING", payload: isLoading });
  };

  // Calculer les layouts à partir des segments
  const layouts = groupSegmentsIntoLayouts(state.segments);

  const value = {
    state,
    layouts,
    updateSegments,
    updateSegment,
    setChoices,
    setLoading,
  };

  return (
    <ComicContext.Provider value={value}>{children}</ComicContext.Provider>
  );
}

export const useComic = () => {
  const context = useContext(ComicContext);
  if (!context) {
    throw new Error("useComic must be used within a ComicProvider");
  }
  return context;
};
