// xl:title 端到端：异步重试与错误分类（不用定时器）
// xl:round 323
// xl:judge stdout
// xl:end

class Transient extends Error {}
async function attempt(n: number): Promise<string> {
  if (n < 3) throw new Transient("flaky " + n);
  return "ok@" + n;
}
async function withRetry(tries: number): Promise<string> {
  const failures: string[] = [];
  for (let i = 1; i <= tries; i++) {
    try { return await attempt(i); }
    catch (e) { failures.push((e as Error).message); }
  }
  throw new Error("gave up: " + failures.join("|"));
}
async function main() {
  console.log(await withRetry(5));
  try { await withRetry(2); } catch (e) { console.log((e as Error).message, e instanceof Error); }
}
main();
