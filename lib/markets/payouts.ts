export function calcWinnerPayout(
  amount: number,
  totalPool: number,
  totalWinningSide: number
): number {
  if (totalWinningSide === 0) return 0;
  const adjustedPool = totalPool * 0.95;
  return Number(((amount / totalWinningSide) * adjustedPool).toFixed(2));
}
