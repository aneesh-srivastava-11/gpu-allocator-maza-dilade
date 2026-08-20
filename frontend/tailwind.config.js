/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nav: {
          bg: '#0B1220', // Fixed deep navy for sidebar in both modes
          hover: '#152035',
          active: '#F97316'
        },
        brand: {
          orange: '#F97316',
          'orange-hover': '#EA580C',
        },
        canvas: {
          light: '#F4F5F7',
          dark: '#0F1524',
        },
        card: {
          light: '#FFFFFF',
          dark: '#161D2E',
        }
      },
      borderRadius: {
        'card': '16px',
      }
    },
  },
  plugins: [],
}
