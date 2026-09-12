import { useRef } from "react";

/**
 * Stable React keys for the filter/sort row lists. The rows are plain
 * `{field, operator, value}` objects rebuilt on every edit and carry no id of
 * their own — an id can't be persisted into them because the canvas refetch key
 * is a `JSON.stringify` of those objects. So keys are minted here and moved with
 * the rows: `dropKey(index)` removes that row's key instead of letting the rows
 * after it inherit it.
 *
 * Call `dropKey` before the `onChange` that shortens the list.
 */
export const useRowKeys = (count: number) => {
  const nextId = useRef(0);
  const keys = useRef<string[]>([]);

  while (keys.current.length < count) keys.current.push(`row-${nextId.current++}`);
  if (keys.current.length > count) keys.current = keys.current.slice(0, count);

  return {
    keys: keys.current,
    dropKey: (index: number) => {
      keys.current = keys.current.filter((_, i) => i !== index);
    },
  };
};
