import { Message } from "./ai-panel-helper";

const STORAGE_KEY = "ai-conversations";

export type AiConversationType = "defaultLang" | "imageGeneration";

interface AiConversationData {
  chats: Message[];
}

interface AiConversationsStorage {
  defaultLang: AiConversationData;
  imageGeneration: AiConversationData;
}

const getDefaultStorage = (): AiConversationsStorage => ({
  defaultLang: { chats: [] },
  imageGeneration: { chats: [] },
});

export const getAiConversations = (): AiConversationsStorage => {
  if (typeof window === "undefined") return getDefaultStorage();

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultStorage();
    return JSON.parse(stored) as AiConversationsStorage;
  } catch {
    return getDefaultStorage();
  }
};

export const getChatsForType = (type: AiConversationType): Message[] => {
  const conversations = getAiConversations();
  return conversations[type]?.chats || [];
};

export const saveChatsForType = (type: AiConversationType, chats: Message[]): void => {
  if (typeof window === "undefined") return;

  try {
    const conversations = getAiConversations();
    conversations[type] = { chats };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    // Silently fail if sessionStorage is not available
  }
};

export const resetChatsForType = (type: AiConversationType): void => {
  saveChatsForType(type, []);
};
