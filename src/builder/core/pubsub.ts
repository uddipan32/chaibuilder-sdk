type EventCallback<T = any> = (data?: T) => void;

class PubSub {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  subscribe<T>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }

    this.subscribers.get(eventName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(eventName);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(eventName);
        }
      }
    };
  }

  publish<T>(eventName: string, data?: T): void {
    const subs = this.subscribers.get(eventName);
    if (subs) {
      subs.forEach((callback) => callback(data));
    }
  }
}

// Create a single instance for global use
export const pubsub = new PubSub();
