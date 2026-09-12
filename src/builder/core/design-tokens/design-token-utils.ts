import { TFunction } from "i18next";

export interface DesignToken {
  name: string;
  value: string;
}

export type DesignTokens = Record<string, DesignToken>;

export const validateTokenName = (tokenName: string): boolean => {
  const trimmed = tokenName.trim();
  if (trimmed.length === 0 || trimmed.length > TOKEN_MAX_LENGTH) {
    return false;
  }
  const nameRegex = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;
  return nameRegex.test(trimmed);
};

const TOKEN_MAX_LENGTH = 75;

export const getTokenNameError = (
  tokenName: string,
  designTokens: DesignTokens,
  t: TFunction,
  isEditing: boolean = false,
  currentTokenId?: string,
): string => {
  const trimmed = tokenName.trim();

  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.length > TOKEN_MAX_LENGTH) {
    return t("Token name must be {{max}} characters or less", { max: TOKEN_MAX_LENGTH });
  }

  const nameRegex = /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/;
  if (!nameRegex.test(trimmed)) {
    return t("Only alphanumeric characters and hyphens allowed");
  }

  const existingTokenWithName = Object.entries(designTokens).find(
    ([id, token]) => token.name === trimmed && (!isEditing || id !== currentTokenId),
  );
  if (existingTokenWithName) {
    return t("Token name already exists");
  }

  return "";
};

export const convertTokenNameInput = (value: string): string => {
  return value.replace(/\s+/g, "-");
};
