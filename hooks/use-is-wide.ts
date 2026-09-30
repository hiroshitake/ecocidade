import { useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

// Returns true on wide web screens. Starts false until after mount so the
// static web HTML (rendered without a real window) matches the first render.
export function useIsWide(minWidth: number) {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(Platform.OS !== "web");
  useEffect(() => setMounted(true), []);
  return mounted && Platform.OS === "web" && width >= minWidth;
}
