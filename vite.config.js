import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Só vale para "npm run dev" (desenvolvimento local). Encaminha as chamadas de
  // /api para o servidor local do assistente (dev-server.cjs), para não depender
  // do "vercel dev". Não afeta o build de produção nem o deploy na Vercel.
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
