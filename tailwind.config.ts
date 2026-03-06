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
          dark: '#5C3D2E',      // Dark brown (from logo, primary text/headers)
          brown: '#8B4513',     // Medium brown (secondary elements)
          pink: '#E8B4B8',      // Light pink (accent buttons, highlights)
          'pink-dark': '#D4919A', // Deeper pink (hover states)
          cream: '#FFF8F0',     // Warm cream (page background)
          light: '#FDF0EC',     // Light blush (card backgrounds, badges)
          white: '#FFFFFF',     // Pure white (cards)
          muted: '#9C8578',     // Muted brown (secondary text)
          hero: '#5C3D2E',      // Hero/splash background (matches logo)
        },
      },
    },
  },
  plugins: [],
};
export default config;
