import plugin from "tailwindcss/plugin";

/**
 * This is the tailwind plugin for chai builder
 * @param {*} theme
 * @returns typeof plugin
 */
export default plugin(function ({ addBase, theme }) {
  addBase({
    "h1,h2,h3,h4,h5,h6": {
      fontFamily: theme("fontFamily.heading"),
    },
    body: {
      fontFamily: theme("fontFamily.body"),
      color: theme("colors.foreground"),
      backgroundColor: theme("colors.background"),
    },
  });
});
