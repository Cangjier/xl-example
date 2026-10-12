// xl:title 异步函数里 `throw` 与 `return await` 的形状（账）
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why 与 `p737a-a17` 同一条根（**续链的微任务格数**）：`await` 一条**已拒绝**的承诺
// xl:why （走 `try` / `catch` 那一档，再接 `.then`）在本仓比 Node **晚一格**。
// xl:why 实测最小形状：`g()`（`return await Promise.reject(…)` + `catch`）/ `h()`（`return Promise.resolve(…)`）
// xl:why 与 `Promise.resolve().then(…)` 三条并排时，Node 的次序是 `plain,g,h`、本仓是 `h,plain,g`；
// xl:why 在这个文件里那一格之差让 `g` 的那一行**排到了收摊之后**（少打印一行）。
// xl:end
// 第 802 轮改名（原 `p737b-b07`）：`xl:want` / `xl:why` 与正文一字未动。
async function f() { throw new Error("boom"); }
f().catch((e: any) => console.log("caught", e.message, e instanceof Error));
async function g() { try { return await Promise.reject(new Error("r")); } catch (e: any) { return "c:" + e.message; } }
g().then((v) => console.log(v));
async function h() { return Promise.resolve("inner"); }
h().then((v) => console.log("h", v, typeof v));
