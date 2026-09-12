import { atom, useAtom } from "jotai";

export type PendingAiPrompt = {
  /** Raw text the user typed -- shown in the chat bubble. */
  prompt: string;
  /** prompt + hidden instruction -- what's actually sent, when it differs. */
  content?: string;
  /** Block selected at submit time, not re-read later. */
  blockId: string;
  model?: string;
  /** Typewriter the prompt into the composer before sending. */
  autoType?: boolean;
  /** Page the prompt was written on -- discarded if consumed on another page. */
  pageId?: string | null;
};

/** A prompt handed off to the left AI panel (Style panel or block floating prompt), waiting for it to be mounted and idle. */
export const pendingAiPromptAtom = atom<PendingAiPrompt | null>(null);
pendingAiPromptAtom.debugLabel = "pendingAiPromptAtom";

export const usePendingAiPrompt = () => useAtom(pendingAiPromptAtom);
