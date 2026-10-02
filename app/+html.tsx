import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML document for Expo Router Web.
 *
 * The theme bootstrap runs before the browser receives the theme-color meta.
 * This is important on mobile Chrome because the browser toolbar can choose
 * its color during the initial document load, before React hydrates.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const key = "@ecocidade/theme-mode";
                  const stored = window.localStorage.getItem(key);
                  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  const dark =
                    stored === "dark" ||
                    (stored !== "light" && systemDark);
                  const color = dark ? "#0b0f19" : "#f8fafc";
                  const scheme = dark ? "dark" : "light";

                  document.documentElement.style.colorScheme = scheme;

                  const meta = document.createElement("meta");
                  meta.name = "theme-color";
                  meta.content = color;
                  document.head.appendChild(meta);
                } catch {
                  const meta = document.createElement("meta");
                  meta.name = "theme-color";
                  meta.content = "#f8fafc";
                  document.head.appendChild(meta);
                }
              })();
            `,
          }}
        />

        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
