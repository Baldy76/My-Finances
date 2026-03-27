/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        halifax: '#0033A0',
        barclays: '#00AEFF',
        starling: '#00E6C3',
        darkbg: '#0F172A',
        cardbg: '#1E293B',
      },
    },
  },
  plugins: [],
}
