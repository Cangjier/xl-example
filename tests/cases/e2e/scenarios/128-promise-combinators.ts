// xl:title 承诺组合子的实战：allSettled 汇总 + race 超时
// xl:round 371
// xl:judge stdout
// xl:end
type Job = { name: string; ms: number; fail?: boolean };
function run(job: Job): Promise<string> {
  return new Promise((resolve, reject) => {
    if (job.fail) { reject(new Error(job.name + " failed")); return; }
    Promise.resolve().then(() => resolve(job.name + ":" + job.ms));
  });
}
async function main(): Promise<void> {
  const jobs: Job[] = [{ name: "a", ms: 10 }, { name: "b", ms: 20, fail: true }, { name: "c", ms: 30 }];
  const settled = await Promise.allSettled(jobs.map(run));
  for (const s of settled) {
    console.log(s.status, s.status === "fulfilled" ? s.value : (s.reason as Error).message);
  }
  const anyResult = await Promise.any([run({ name: "slow", ms: 100 }), run({ name: "fast", ms: 1 })]);
  console.log("any", anyResult);
  try {
    await Promise.any([run({ name: "x", ms: 1, fail: true }), run({ name: "y", ms: 2, fail: true })]);
  } catch (e: any) {
    console.log("all-failed", e.errors.length);
  }
  const raced = await Promise.race([run({ name: "quick", ms: 1 }), run({ name: "later", ms: 50 })]);
  console.log("race", raced);
}
main();
