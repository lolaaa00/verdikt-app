export function calcOdds(stakedA: number, stakedB: number) {
  const total = stakedA + stakedB;
  if (total === 0) return { oddsA: 50, oddsB: 50 };
  return {
    oddsA: Math.round((stakedA / total) * 100),
    oddsB: Math.round((stakedB / total) * 100),
  };
}

export function calcMultiplier(myStake: number, mySideTotalStaked: number, totalPool: number): number {
  if (mySideTotalStaked === 0) return 0;
  const adjustedPool = totalPool * 0.95;
  return Number(((adjustedPool / mySideTotalStaked)).toFixed(2));
}

export function calcPotentialPayout(amount: number, multiplier: number): number {
  return Number((amount * multiplier).toFixed(2));
}
