// xl:title 端到端：async 函数在 map 回调里 throw，再交给 allSettled
// xl:round 639
// xl:judge stdout
// xl:end

async function risky(n: number): Promise<number> {
  if (n === 3) throw new Error("bad");
  return n * 2;
}
async function main(): Promise<void> {
  const settled = [1, 2, 3].map((n) => risky(n));
  const results = await Promise.allSettled(settled);
  console.log(results.length, results[2].status, results[2].reason.message);
}
main();
