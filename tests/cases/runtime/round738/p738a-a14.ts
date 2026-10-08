// xl:title `await` 后面跟逻辑链在条件与 `for await` 里
// xl:round 738
// xl:judge stdout
// xl:want differ
// xl:why **`await` 的操作数被当成了「它后面的全部」**（静默错值）：JS 里 `await` 是**一元**前缀、
// xl:why 比 `&&` / `+` 都紧，所以 `await x && y` 是 `(await x) && y`、`await x + 1` 是 `(await x) + 1`；
// xl:why 本仓把 `await` **后面那一整个单元**当成了操作数（`await (x && y)` / `await (x + 1)`）。
// xl:why 实测两条对照：`await Promise.resolve(1) + 1` 在 Node 里给 `2`、本仓给 `[object Promise]1`；
// xl:why `await Promise.resolve(0) && "T"` 在 Node 里给 `0`、本仓给 `"T"`——**都不是抛，是错值**。
// xl:why **它不是逻辑运算符那一族的问题**：`+` 那一支（在二元段之前就成形的那条路）一模一样，
// xl:why 所以根在**投影层**那句「`await` 收 `kids.slice(1)`」——
// xl:why 正确的读法是「`await` 只吃紧随其后的那**一个操作数**，剩下的照常折链」
// xl:why （第 711 轮收 `typeof o[k]().v` 那一格用的就是这个形状：把操作数接上后面那些格、当场递归折完）。
// xl:why **第 738 轮只收掉了 `yield` / `throw` 两格**（它们的操作数**本来就该**是整段表达式，
// xl:why 缺的是 token 层那个「谁是段起点」的名单）——`await` 这一格留着，如实登记。
// xl:end
async function f(x: any) { return await x && "T"; }
async function g(x: any) { if (await x || false) return "Y"; return "N"; }
async function main() {
  console.log(await f(Promise.resolve(1)), await f(Promise.resolve(0)));
  console.log(await g(Promise.resolve(0)), await g(Promise.resolve(1)));
  const out: string[] = [];
  for await (const v of [1, 2] as any) out.push((v && "v" + v) as string);
  console.log(out.join(","));
}
main();
