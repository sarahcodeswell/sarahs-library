/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          cream: {
            50: '#FFFEF9',
            100: '#FDFBF4',
            200: '#FAF6E9',
            300: '#F5EFDC',
          },
          ivory: {
            50: '#FFFFF8',
            100: '#FEFEF5',
            200: '#FDFCF0',
          },
          sage: {
            50: '#F6F7F4',
            100: '#E8EBE4',
            200: '#D4DAD0',
            300: '#B5C0AC',
            400: '#96A888',
            500: '#7A8F6C',
            600: '#5F7252',
            700: '#4A5940',
          },
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
          serif: ['Crimson Pro', 'serif'],
        },
      },
    },
    plugins: [],
  }
