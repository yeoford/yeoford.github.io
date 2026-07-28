export const safeParseInt = (
  value: string | undefined,
  defaultTo: number = -1
): number => {
  if (!value) {
    return defaultTo;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultTo : parsed;
};
