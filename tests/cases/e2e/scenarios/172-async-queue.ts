// xl:title 端到端：串行队列（Promise 链 + async/await）
// xl:round 623
// xl:judge stdout
// xl:end

const log: number[] = [];
function task(n: number) {
  return new Promise<void>((res) => {
    log.push(n);
    Promise.resolve().then(() => res());
  });
}
async function run() {
  for (const n of [1, 2, 3]) await task(n);
  console.log(log.join(","));
  console.log(await Promise.resolve("done"));
}
run();
console.log("queued");
