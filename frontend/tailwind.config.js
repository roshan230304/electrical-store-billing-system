/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apexbill: {
          sidebar: '#1e2238',
          sidebarHover: '#282d49',
          sidebarActive: '#222842',
          red: '#e01a4f',
          redDark: '#c71342',
          blue: '#1976d2',
          blueDark: '#1565c0',
          bgLight: '#f4f6f9',
          border: '#e2e8f0',
          textMuted: '#64748b',
          darkCard: '#151828'
        },
        vyapar: {
          sidebar: '#1e2238',
          sidebarHover: '#282d49',
          sidebarActive: '#222842',
          red: '#e01a4f',
          redDark: '#c71342',
          blue: '#1976d2',
          blueDark: '#1565c0',
          bgLight: '#f4f6f9',
          border: '#e2e8f0',
          textMuted: '#64748b',
          darkCard: '#151828'
        }
      }
    },
  },
  plugins: [],
}

