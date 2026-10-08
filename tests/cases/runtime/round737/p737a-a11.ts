// xl:title `async` 函数的返回值与 `await` 的时序
// xl:round 737
// xl:judge stdout
// xl:end
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
