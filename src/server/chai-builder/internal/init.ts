import { getSiteSettings } from "../public/get-site-settings";
import { getRequestState, verifyInit } from "../state";

export const loadSiteSettings = async (_draftMode: boolean): Promise<void> => {
  verifyInit();
  const siteSettings = await getSiteSettings();
  setFallbackLang(siteSettings?.fallbackLang || "en");
};

export const getAppId = (): string | null => {
  return getRequestState().appId;
};

export const setAppId = (appId: string): void => {
  getRequestState().appId = appId;
};

export const setDraftMode = (draftMode: boolean): void => {
  const state = verifyInit();
  state.draftMode = draftMode;
};

export const getFallbackLang = (): string => {
  const state = verifyInit();
  return state.fallbackLang;
};

export const setFallbackLang = (lang: string): void => {
  const state = verifyInit();
  state.fallbackLang = lang;
};

export const getLang = (): string | null => {
  const state = verifyInit();
  return state.lang;
};

export const setLang = (lang: string | null): void => {
  const state = verifyInit();
  state.lang = lang;
};

export const getSiteUrl = (): string | null => {
  return getRequestState().siteUrl;
};

export const setSiteUrl = (siteUrl: string | null): void => {
  getRequestState().siteUrl = siteUrl;
};

export const initState = (appId: string, draftMode: boolean, siteUrl?: string | null): void => {
  const state = getRequestState();
  state.appId = appId;
  state.userId = null;
  state.draftMode = draftMode;
  state.initialized = true;
  state.siteUrl = siteUrl ?? null;
};

export const initStateWithUser = (appId: string, userId: string, draftMode: boolean, siteUrl?: string | null): void => {
  const state = getRequestState();
  state.appId = appId;
  state.userId = userId;
  state.draftMode = draftMode;
  state.initialized = true;
  state.siteUrl = siteUrl ?? null;
};
