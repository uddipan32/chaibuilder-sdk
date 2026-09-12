"use client";

/**
 * Controlled/uncontrolled state hook. Internal replacement for the
 * `@radix-ui/react-use-controllable-state` package (MIT,
 * https://github.com/radix-ui/primitives), matching its behavior for the
 * subset we use.
 */

import * as React from "react";

type SetStateFn<T> = (prevState?: T) => T;

interface UseControllableStateParams<T> {
  prop?: T | undefined;
  defaultProp?: T | undefined;
  onChange?: (state: T) => void;
}

/** Stable-identity wrapper around the latest callback. */
function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): T {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  return React.useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, []);
}

function useUncontrolledState<T>({ defaultProp, onChange }: Omit<UseControllableStateParams<T>, "prop">) {
  const uncontrolledState = React.useState<T | undefined>(defaultProp);
  const [value] = uncontrolledState;
  const prevValueRef = React.useRef(value);
  const handleChange = useCallbackRef(onChange);

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      handleChange(value as T);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef, handleChange]);

  return uncontrolledState;
}

export function useControllableState<T>({ prop, defaultProp, onChange = () => {} }: UseControllableStateParams<T>) {
  const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({ defaultProp, onChange });
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;
  const handleChange = useCallbackRef(onChange);

  const setValue: React.Dispatch<React.SetStateAction<T | undefined>> = React.useCallback(
    (nextValue) => {
      if (isControlled) {
        const setter = nextValue as SetStateFn<T>;
        const newValue = typeof nextValue === "function" ? setter(prop) : nextValue;
        if (newValue !== prop) handleChange(newValue as T);
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, handleChange],
  );

  // When defaultProp is provided the value is never undefined at runtime;
  // mirror Radix's published types by narrowing to T.
  return [value as T, setValue] as const;
}
