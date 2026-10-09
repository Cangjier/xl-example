// xl:title `async` / `await`：并发、次序与 `try` 里的等待
// xl:round 749
// xl:judge stdout
// xl:end
// 本文件是 `p749a-a05` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

async function f() {
  const a = await Promise.resolve("a");
  const b = await Promise.resolve("b");
  return a + b;
}
f().then((v) => console.log("f", v));
async function g() {
  try { await Promise.reject("bad"); console.log("not here"); } catch (e) { console.log("caught", e); }
  return "after";
}
g().then((v) => console.log("g", v));
async function h() { for (const v of [1, 2]) { await Promise.resolve(); console.log("h", v); } return "hdone"; }
h().then((v) => console.log(v));
console.log("sync");
