// xl:title `then` 与 `await` 的微任务次序
// xl:round 691
// xl:judge stdout
// xl:end
async function main(): Promise<void> {
  console.log("a");
  await null;
  console.log("c");
}
console.log("start");
main();
Promise.resolve().then(() => console.log("b"));
console.log("end");
