/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bccffd',
          400: '#5b7ee8',
          500: '#3d63dd',
          600: '#2f4fc0',
          700: '#26409c',
          800: '#1d3178',
          900: '#0f2860',
        },
      },
      boxShadow: {
        // Sombra suave de 2 capas (tipo "elevación 1" de un dashboard SaaS) en
        // vez del shadow-sm plano por defecto de Tailwind — da profundidad sin
        // verse pesada.
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 2px 8px -2px rgb(15 23 42 / 0.06)',
        'card-hover': '0 2px 4px 0 rgb(15 23 42 / 0.06), 0 8px 16px -4px rgb(15 23 42 / 0.10)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
