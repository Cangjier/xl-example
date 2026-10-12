// xl:title 0/1 背包与零钱兑换（DP + 回溯解）
// xl:round 371
// xl:judge stdout
// xl:end
type Item = { name: string; w: number; v: number };
const items: Item[] = [
  { name: "map", w: 2, v: 3 },
  { name: "rope", w: 3, v: 4 },
  { name: "torch", w: 4, v: 5 },
  { name: "food", w: 5, v: 8 },
];
const cap = 9;
const dp: number[][] = [];
for (let i = 0; i <= items.length; i++) {
  const row: number[] = [];
  for (let w = 0; w <= cap; w++) row.push(0);
  dp.push(row);
}
for (let i = 1; i <= items.length; i++) {
  for (let w = 0; w <= cap; w++) {
    dp[i][w] = dp[i - 1][w];
    if (items[i - 1].w <= w) dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - items[i - 1].w] + items[i - 1].v);
  }
}
const picked: string[] = [];
let w = cap;
for (let i = items.length; i > 0; i--) {
  if (dp[i][w] !== dp[i - 1][w]) { picked.unshift(items[i - 1].name); w -= items[i - 1].w; }
}
console.log(dp[items.length][cap], picked.join(","));
function coins(amount: number, kinds: number[]): number {
  const best: number[] = [];
  for (let i = 0; i <= amount; i++) best.push(i === 0 ? 0 : Infinity);
  for (let i = 1; i <= amount; i++) {
    for (const c of kinds) if (c <= i && best[i - c] + 1 < best[i]) best[i] = best[i - c] + 1;
  }
  return best[amount];
}
console.log(coins(11, [1, 2, 5]), coins(3, [2]), coins(0, [1]));
