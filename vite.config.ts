import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: [
      "ardetkotillhono.se",
      "www.ardetkotillhono.se",
      "ardetkotillvarholmen.se",
      "www.ardetkotillvarholmen.se",
      "ärdetkötillhönö.se",
      "www.ärdetkötillhönö.se",
      "xn--rdetktillhn-k8a3vfb.se",
      "www.xn--rdetktillhn-k8a3vfb.se",
      "ärdetkötillvarholmen.se",
      "www.ärdetkötillvarholmen.se",
      "xn--rdetktillvarholmen-ktb97a.se",
      "www.xn--rdetktillvarholmen-ktb97a.se",
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
