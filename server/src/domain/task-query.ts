export const buildTaskHistoryWhere = (userId: string, role: string, mine: boolean): { userId?: string } => {
  if (role !== 'ADMIN' || mine) return { userId };
  return {};
};
