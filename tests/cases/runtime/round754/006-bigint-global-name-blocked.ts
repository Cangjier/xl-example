// xl:title `BigInt` 这个全局名的现状
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:want blocked
// xl:why 第 1 行 `typeof BigInt`：Node 给 `"function"`、本仓在**降级期**就报
// xl:why `name is not a local or a capture: BigInt`——`BigInt` 不在 `GlobalNames()` 里。
// xl:why **这是全仓最大的一处已知缺口**（`1n` 这种字面量连投影都还没有），
// xl:why 台账 `stdlib/bigint/*` 与根 README 的「明确不做」都写着它。
// xl:why 这一条**只做一件事**：把「`BigInt` 这个名字今天不存在」钉在最短的那一句上，
// xl:why 免得后来的人把它当成「漏了一个全局名」。
// xl:end
// 本文件是 `p754g-01` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('typeof BigInt', show(() => typeof BigInt));
console.log('typeof BigInt64Array', show(() => typeof BigInt64Array));
console.log('typeof 1n', show(() => typeof 1n));
console.log('(1n).toString()', show(() => (1n).toString()));
console.log('typeof (1 as any).n', show(() => typeof (1 as any).n));
console.log('BigInt(1)', show(() => BigInt(1)));
console.log('typeof Symbol.toStringTag', show(() => typeof Symbol.toStringTag));
