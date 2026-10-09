// xl:title `await` 一个 thenable：`then` 要真的被调用一次
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why **`await` 一个 thenable 不调它的 `then`**（静默错值）：`await { then(res) { res(7) } }`
// xl:why 在 Node 里给 `7`，本仓把那个对象自己交出来（`[object Object]`）。
// xl:why 同一条根在 `runtime/async/041-await-thenable` 上登着（`node «then called» vs tsrun «got …»`）——
// xl:why 本仓的 `await` 只认**自己造的承诺**，不走规范那条 `PromiseResolve` 的「有 `then` 就采纳」路。
// xl:why **收它要在 await 那一格加一条**：值是对象且有可调的 `then` 时，先按 thenable 采纳一次
// xl:why （这正是 `new Promise(executor)` 里 resolve 那一支已经有的逻辑，两处应该合成一处）。
// xl:end
// 本文件是 `p737a-a16` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const log: string[] = [];
const thenable: any = { then(res: any) { log.push("then-called"); res(7); } };
async function main() { const v = await thenable; log.push("got:" + v); }
main();
const bad: any = { then() { throw new Error("boom"); } };
async function main2(t: any) { try { await t; } catch (e: any) { console.log("caught", e.message); } }
main2(bad);
async function report() { await 0; await 0; await 0; console.log(log.join(",")); }
report();
