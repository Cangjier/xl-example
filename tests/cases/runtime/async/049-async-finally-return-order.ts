// xl:title `async` 里 `finally` 里的 `return` 会顶掉 `try` 里的值吗
// xl:round 691
// xl:judge stdout
// xl:end
async function f(): Promise<number> {
  try { return 1; } finally { console.log("fin"); }
}
async function g(): Promise<number> {
  try { return 1; } finally { return 2; }
}
f().then((v: number) => console.log("f", v));
g().then((v: number) => console.log("g", v));
