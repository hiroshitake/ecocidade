import { Colors } from "../constants/theme";
import { useAppTheme } from "../context/theme-context";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const { isDark, colors } = useAppTheme();
  const colorFromProps = props[isDark ? "dark" : "light"];

  return colorFromProps ?? colors[colorName];
}
