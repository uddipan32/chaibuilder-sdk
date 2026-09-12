import { EmptyPageStarterMode, EmptyPageStarterOption } from "./index";

let config: { mode: EmptyPageStarterMode; options: EmptyPageStarterOption[] } = {
  mode: "dialog",
  options: ["AI", "BLANK", "TEMPLATE"],
};

export const setEmptyPageStarterConfig = (c: { mode: EmptyPageStarterMode; options: EmptyPageStarterOption[] }) => {
  config = c;
};

export const getEmptyPageStarterConfig = () => config;
