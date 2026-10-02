import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: `
          (() => {
            try {
              const key = "@ecocidade/theme-mode";
              const stored = window.localStorage.getItem(key);
              const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              const dark = stored === "dark" || (stored !== "light" && systemDark);
              const color = dark ? "#0b0f19" : "#f8fafc";
              const scheme = dark ? "dark" : "light";
              document.documentElement.style.colorScheme = scheme;
              document.documentElement.style.backgroundColor = color;
              document.body && (document.body.style.backgroundColor = color);
              const meta = document.createElement("meta");
              meta.name = "theme-color";
              meta.content = color;
              document.head.appendChild(meta);
            } catch {
              document.documentElement.style.backgroundColor = "#f8fafc";
            }
          })();
        ` }} />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
