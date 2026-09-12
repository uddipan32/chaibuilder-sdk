import { useEffect, useMemo } from "react";
import { pubsub } from "~/builder/core/pubsub";

/** Subscribe to a builder pubsub event. */
export function usePubSubListener<T>(eventName: string, callback: (data?: T) => void) {
  useEffect(() => {
    const unsubscribe = pubsub.subscribe<T>(eventName, callback);
    return () => unsubscribe();
  }, [eventName, callback]);
}

/** Stable `publish` for builder pubsub. */
export function usePubSub() {
  return useMemo(() => pubsub.publish.bind(pubsub) as typeof pubsub.publish, []);
}
