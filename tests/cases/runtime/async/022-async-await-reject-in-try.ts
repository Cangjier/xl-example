// xl:title 被拒绝的承诺：`await` 之后才拒绝的那一档
// xl:round 330
// xl:judge stdout
// xl:end

async function f(n: number): Promise<number> {
  await null;
  if (n === 2) throw new Error("boom");
  return n * 10;
}
async function run(): Promise<void> {
  const out: number[] = [];
  for (const n of [1, 2, 3]) {
    try {
      out.push(await f(n));
    } catch (e) {
      out.push(-1);
    }
  }
  console.log(out.join(","));
  const caught = await f(2).catch((e) => "caught:" + (e as Error).message);
  console.log(caught);
}
run();
