// xl:title `async` 函数的返回值与 `await` 的时序
// xl:round 737
// xl:judge stdout
// xl:end
// 本文件是 `p737a-a11` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const log: string[] = [];
async function f() { log.push("start"); const v = await 1; log.push("after:" + v); return v + 1; }
f().then((v) => log.push("then:" + v));
log.push("sync");
Promise.resolve().then(() => log.push("micro"));
console.log(log.join(","));
async function main() {
  await 0;
  console.log(log.join(","));
}
main();
