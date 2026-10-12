// xl:title async 体里抛：承诺被拒绝、调用处接得住（含 `await` 与函数体返回）
// xl:round 304
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：probe695-x02（`undefined.f` 拿到的
// 确实是 `TypeError`，`name` 那一格逐字对上）。
// 判定点只有一个：**async / await 那条路上抛出来的错接得住，接住的是什么**。
async function boom() {
  throw new Error("async-boom");
}
boom().catch((e) => console.log("caught", e.message));
async function viaAwait() {
  try {
    await boom();
  } catch (e: any) {
    return "handled:" + e.message;
  }
}
viaAwait().then((v) => console.log(v));
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log("undefined-get:", show((function () { try { (undefined as any).f; } catch (e) { return e.name; } })())); }
catch (e: any) { console.log("undefined-get:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
