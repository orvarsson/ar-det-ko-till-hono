import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: [
      "ärdetkötillhönö.se",
      "xn--rdetktillhn-k8a3vfb.se",
      "ärdetkötillvarholmen.se",
      "xn--rdetktillvarholmen-ktb97a.se",
      "localhost",
    ],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
});
