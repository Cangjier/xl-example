// xl:title 空值接收者上的可选调用：那一读被整段跳过
// xl:round 772
// xl:judge stdout
// xl:want differ
// xl:why `u.x?.()`（`u` 是 `undefined` / `null`）在 JS 里是 **TypeError**——`?.` 只护**它左边那一格**（`u.x` 的读），而那个读要 `RequireObjectCoercible`；本仓把整条链都当成可选的 ⇒ **静默跳过**、给出 `undefined`、连 `try` 都不进（第 772 轮普查的 `p772c`）。**只有接收者为空值那两行（01 / 06）不同**；分界由其余六行钉着：`u?.x()`（`?.` 在接收者那一格上）两边都给 `undefined`、`u.x.y?.()` / `u.x!()` / `u["x"]?.()` 两边都抛 `TypeError`、`o.x?.()`（接收者是对象、方法不存在）两边都给 `undefined`
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
const u: any = undefined;
const o: any = {};
console.log('01 u.x?.()', show(() => u.x?.()));
console.log('02 u?.x()', show(() => u?.x()));
console.log('03 u.x.y?.()', show(() => u.x.y?.()));
console.log('04 o.x?.()（方法不存在）', show(() => o.x?.()));
console.log('05 o.x?.y()', show(() => o.x?.y()));
console.log('06 (null).x?.()', show(() => (null as any).x?.()));
console.log('07 u.x!()', show(() => u.x!()));
console.log('08 u["x"]?.()', show(() => u["x"]?.()));
