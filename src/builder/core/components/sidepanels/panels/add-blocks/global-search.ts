export const matchesGlobalSearch = (
  query: string,
  values: Array<string | undefined>,
) => {
  const normalizedQuery = query.trim().toLowerCase();
  return (
    normalizedQuery.length > 0 &&
    values.some((value) => value?.toLowerCase().includes(normalizedQuery))
  );
};
