// xl:title 端到端：Promise.allSettled + 状态分桶 + 顺序保持
// xl:round 639
// xl:judge stdout
// xl:end

async function risky(n: number): Promise<number> {
  if (n % 3 === 0) return Promise.reject(new Error("bad " + n));
  return n * 2;
}
async function main(): Promise<void> {
  const settled = [1, 2, 3, 4, 5, 6].map((n) => risky(n));
  const results = await Promise.allSettled(settled);
  const ok: string[] = [];
  const bad: string[] = [];
  for (const item of results) {
    if (item.status === "fulfilled") ok.push(String(item.value));
    else bad.push(item.reason.message);
  }
  console.log(ok.join(","));
  console.log(bad.join(","));
  console.log(results.length, ok.length, bad.length);
}
main();
