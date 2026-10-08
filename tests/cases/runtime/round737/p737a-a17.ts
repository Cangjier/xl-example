// xl:title `then` 返回新承诺 / `catch` 恢复 / `finally` 的透传
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why **承诺续链的微任务格数与 Node 差一格**（次序/收摊时点因此不同）：
// xl:why 同一个文件里两条链（一条过 `finally`、一条不过）与一个固定的报告点一比，
// xl:why 本仓把 `finally` **之后**那一步（`g`）排进了报告点之前，Node 没有。
// xl:why 实测的另一个方向在 `p737b-b07`（`await` 一条**已拒绝**的承诺走 `catch` 那一档，
// xl:why 本仓**晚**一格：Node 的次序是 `plain,g,h`、本仓是 `h,plain,g`）。
// xl:why **它不是「承诺那一套没做」**（`Promise` / `async` / `for await` 都在跑）——
// xl:why 差的是 `finally` / `catch` 之后那一次续链各自花几格 tick。
// xl:why **收它要把三条路（`then` / `finally` / `await` 已拒绝那一档）的排班对着规范数一遍**，
// xl:why 本轮先把两支的读数写在这里。
// xl:end
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => { throw new Error("e" + v); })
  .catch((e: any) => "c:" + e.message)
  .finally(() => console.log("fin"))
  .then((v) => console.log("end", v));
Promise.resolve("keep").finally(() => "ignored").then((v) => console.log("pass", v));
Promise.reject(new Error("r")).finally(() => "x").catch((e: any) => console.log("rej", e.message));
