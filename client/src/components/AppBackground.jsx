import { useLocation } from "react-router-dom";
import { InfiniteBackground } from "./InfiniteBackground";

export function AppBackground() {
  const location = useLocation();
  const isGameRoute =
    location.pathname === "/game" || location.pathname === "/debug";

  if (isGameRoute) {
    return null;
  }

  return <InfiniteBackground />;
}
