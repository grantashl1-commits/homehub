import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * In `npm run dev`, serve the Vercel functions in /api from Vite too, so the
 * calendar and Notion work locally with the same .env.local as production.
 */
function vercelApiInDev(): Plugin {
  return {
    name: "homehub-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const name = req.url.split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "");
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const method = (req.method ?? "GET").toUpperCase();
          const handler = mod[method];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(`http://localhost${req.url}`, {
            method,
            headers: req.headers as Record<string, string>,
            body: method === "GET" || method === "HEAD" ? undefined : body,
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(String(e));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Dev API error" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
      react(),
      tailwindcss(),
      vercelApiInDev(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
        manifest: {
          name: "Home Hub",
          short_name: "Home Hub",
          description: "Our family's kitchen screen: jobs and jars, fridge notes, dinner, calendar and nightly wins.",
          theme_color: "#fbf6ee",
          background_color: "#fbf6ee",
          display: "fullscreen",
          orientation: "landscape",
          start_url: "/",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2,json}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              // PointPals characters and chore pictures
              urlPattern: /^https:\/\/tcpbvcgvtwrqsrzerwwr\.supabase\.co\/storage\/v1\/object\/public\/assets\//,
              handler: "CacheFirst",
              options: { cacheName: "pointpals-art", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
            {
              // SIGNAL recipe photos
              urlPattern: ({ url }) => url.pathname.startsWith("/images/recipes/"),
              handler: "CacheFirst",
              options: { cacheName: "signal-recipes", expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
            {
              // House guide photos (booking site's media bucket and the places'
              // own sites), so the guest guide still shows them offline.
              urlPattern: ({ request, sameOrigin }) => request.destination === "image" && !sameOrigin,
              handler: "CacheFirst",
              options: {
                cacheName: "guide-photos",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/api\.open-meteo\.com\//,
              handler: "NetworkFirst",
              options: { cacheName: "weather", networkTimeoutSeconds: 5 },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
