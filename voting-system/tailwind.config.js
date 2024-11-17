/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
        lato: ["Lato", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#4C9BFB",
        secondary: "#2E8B57",
        accent: "#F8AFA6",
        background: "#F7F9FC",
        dark: "#333333",
        light: "#888888",
        button: "#1D72B8",
        error: "#E53E3E",
        success: "#38A169",
        warning: "#FF6F61",
        info: "#70C1B3",
      },
      extend: {
        animation: {
          fadeIn: "fadeIn 1s ease-in-out",
          slideIn: "slideIn 1s ease-in-out",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: 0 },
            "100%": { opacity: 1 },
          },
          slideIn: {
            "0%": { transform: "translateX(-100%)", opacity: 0 },
            "100%": { transform: "translateX(0)", opacity: 1 },
          },
        },
      },
    },
  },
  plugins: [],
};
