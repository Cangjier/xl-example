// xl:title TDZ：块里的 `let` 在声明之前 `typeof` 要抛
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why TDZ 那一格的 `typeof`：块里 `let x` 在**声明之前**被 `typeof` 读到时，JS 抛
// xl:why `ReferenceError`（判据打出 `threw ReferenceError`），本仓给 `"undefined"`——
// xl:why **静默错值**。根在 `lowering.xl.md` 的 `NameIsUnreachable`：它只回答「这个名字在不在
// xl:why 作用域链上」（本地槽 → 捕获环境），**不分「找不到」与「还压在 TDZ 里」**——
// xl:why 那一处的注释第 149 轮就写着这一条缺口（`typeof` 两档都给 `"undefined"`）。
// xl:why 收它要的是**真的 TDZ 标记**（`let` / `const` 的槽在初始化前不是 `undefined`，
// xl:why 而是一个「读了就抛」的状态）：`ResolveAccess` 那一侧早有 `DeclaredNames` 的两档
// xl:why （「用在声明之前」与「根本没这个名字」），缺的是**运行期**那一半。
// xl:why 这一条**只影响 `typeof`**：普通读走 `ResolveAccess`、它照样抛（与 JS 一致）。
// xl:end
// 本文件是 `p748a-a01` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

{
  try { console.log(typeof (x as any)); } catch (e) { console.log("threw", (e as Error).constructor.name); }
  let x = 1;
  console.log("after", x);
}
