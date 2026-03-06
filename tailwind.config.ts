import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#5C3D2E',
          brown: '#8B4513',
          accent: '#D2691E',
          cream: '#FFF8DC',
          hero: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
};
export default config;
