// xl:title 微任务次序：`then` 与 `await` 混在一起
// xl:round 305
// xl:judge stdout
// xl:end

console.log("a");
Promise.resolve().then(() => console.log("b"));
async function f() {
  console.log("c");
  await null;
  console.log("d");
}
f();
Promise.resolve().then(() => console.log("e"));
console.log("f");
