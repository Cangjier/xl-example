// xl:title `async` / `await`：并发、次序与 `try` 里的等待
// xl:round 749
// xl:judge stdout
// xl:end
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
