export const orderTransitions: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function canTransitionOrder(from: string, to: string) {
  return from === to || Boolean(orderTransitions[from]?.includes(to));
}
