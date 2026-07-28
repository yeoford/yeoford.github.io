export const parseMonthYear = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    date.setDate(1);
    return date;
  } catch {
    return null;
  }
};
