import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML document for Expo Router Web.
 *
 * The inline theme bootstrap runs before React hydration so the browser can
 * use the user's saved EcoCidade theme when choosing its navigation chrome.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0b0f19"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f8fafc"
        />
        <meta name="color-scheme" content="light dark" />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const key = "@ecocidade/theme-mode";
                  const stored = window.localStorage.getItem(key);
                  const dark =
                    stored === "dark" ||
                    (stored !== "light" &&
                      window.matchMedia("(prefers-color-scheme: dark)").matches);
                  const color = dark ? "#0b0f19" : "#f8fafc";

                  document.documentElement.style.colorScheme = dark ? "dark" : "light";

                  const metas = document.querySelectorAll('meta[name="theme-color"]');
                  metas.forEach((meta) => meta.setAttribute("content", color));
                } catch {}
              })();
            `,
          }}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
