// xl:title `for await` 的每一轮至少让出一次（次序对齐 JS）
// xl:round 339
// xl:judge stdout
// xl:end

const order: string[] = [];
queueMicrotask(() => order.push("qm"));
Promise.resolve().then(() => order.push("then"));
async function* stream(): AsyncGenerator<number> {
  for (let i = 1; i <= 2; i++) yield i;
}
(async () => {
  const got: number[] = [];
  for await (const v of stream()) {
    got.push(v);
    order.push("body" + v);
  }
  console.log("A", got.join(","), order.join(","));
})();
console.log("sync", order.join(","));
const sync = [1, 2];
(async () => {
  const seen: number[] = [];
  for await (const v of sync) seen.push(v * 10);
  console.log("B", seen.join(","), order.join(","));
})();
