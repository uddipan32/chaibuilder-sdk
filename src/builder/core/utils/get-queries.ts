export const getQueries = (mq: string) => {
  const breakpoints = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
  const index = breakpoints.indexOf(mq as (typeof breakpoints)[number]);

  if (index === -1) {
    return ["xs"];
  }

  return breakpoints.slice(0, index + 1);
};
