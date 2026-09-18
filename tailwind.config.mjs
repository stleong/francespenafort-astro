/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F1E36', // Oxford Navy Primary
          800: '#162B4D',
        },
        sand: {
          50: '#FDFCFB',
          100: '#F8F7F4', // Warm Paper Surface
          200: '#EFECE6',
        },
        bronze: {
          600: '#9E7D47', // Muted Gold / Bronze Accent
          700: '#856735',
        },
        charcoal: {
          900: '#1F242E', // High-contrast Body Slate
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};