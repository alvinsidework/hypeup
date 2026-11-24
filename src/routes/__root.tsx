import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { InstagramBrowserAuthProvider } from "@/components/instagram-browser-auth";
import { NativeAuthBridge } from "@/components/native-auth-bridge";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PwaInstallProvider } from "@/components/pwa-install";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import {
  initializeLensTheme,
  lensDarkThemeColor,
  lensLightThemeColor,
} from "@/components/lens-theme";
import { TaskProgressProvider } from "@/components/route-progress";
import appCss from "../styles.css?url";

const APP_NAME = "Lens";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: APP_NAME },
      { name: "color-scheme", content: "light dark" },
      { name: "application-name", content: APP_NAME },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      {
        name: "description",
        content: "Instagram 댓글 운영과 브랜드 문의 기록",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      {
        rel: "apple-touch-icon",
        href: "/__grok/icon-180.png",
        sizes: "180x180",
      },
    ],
  }),
  component: () => (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta
          name="theme-color"
          content={lensLightThemeColor}
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content={lensDarkThemeColor}
          media="(prefers-color-scheme: dark)"
        />
        <script dangerouslySetInnerHTML={{ __html: initializeLensTheme }} />
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <NativeAuthBridge />
        <AuthProvider>
          <PwaInstallProvider>
            <PwaServiceWorker />
            <TaskProgressProvider>
              <InstagramBrowserAuthProvider>
                <Outlet />
              </InstagramBrowserAuthProvider>
            </TaskProgressProvider>
          </PwaInstallProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
