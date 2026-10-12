// xl:title 异步：微任务次序、异步生成器与 `for await`
// xl:round 338
// xl:judge stdout
// xl:end

const order: string[] = [];
async function producer(): Promise<number> {
  order.push("start");
  await null;
  order.push("after-await");
  return 7;
}
queueMicrotask(() => order.push("microtask"));
producer().then((v) => order.push("then" + v));
console.log(order.join(","));
setTimeoutMicrotaskish();
function setTimeoutMicrotaskish(): void {
  Promise.resolve().then(() => order.push("second-then"));
}
async function* stream(): AsyncGenerator<number> {
  for (let i = 1; i <= 3; i++) yield i;
}
(async () => {
  const got: number[] = [];
  for await (const v of stream()) got.push(v);
  console.log(got.join(","), order.join(","));
})();
