import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Root HTML document for Expo Router Web.
 *
 * The theme-color entries let the browser choose the correct initial
 * navigation chrome from the device's color-scheme preference.
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
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
