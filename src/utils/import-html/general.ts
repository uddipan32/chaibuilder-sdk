/**
 * Returns a boolean indicating whether the current environment is development
 * @returns {boolean} A boolean indicating whether the current environment is development
 */
export const isDevelopment = () => process.env.NODE_ENV === "development";
