// xl:title 写回路径上的下标访问器（本轮登记的缺口）
// xl:round 769
// xl:judge stdout
// xl:want differ
// xl:why **写回**那一半本轮没有动：`reverse` / `sort` / `copyWithin` / `fill` / `shift` / `unshift` / `splice` 往一个只有 getter 的下标写，JS 抛 `TypeError`（并带上「读得到、写不进去」的两面），本仓写进元素区、**一声不响**——读路径第 769 轮已收（`r769e-01`），写路径要另一轮
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name + ":" + String((e as Error).message).slice(0, 30);
  }
};
const mk = () => { const a: any = []; Object.defineProperty(a, 0, { get: () => 7, configurable: true, enumerable: true }); a.length = 2; return a; };
console.log('01 JSON.stringify(mk().reverse().slice())', show(() => JSON.stringify(mk().reverse().slice())));
console.log('02 JSON.stringify(mk().sort())', show(() => JSON.stringify(mk().sort())));
console.log('03 JSON.stringify(mk().copyWithin(1, 0))', show(() => JSON.stringify(mk().copyWithin(1, 0))));
console.log('04 JSON.stringify(mk().fill(9, 0, 1))', show(() => JSON.stringify(mk().fill(9, 0, 1))));
console.log('05 JSON.stringify(mk().shift())', show(() => JSON.stringify(mk().shift())));
console.log('06 JSON.stringify(mk().unshift(1))', show(() => JSON.stringify(mk().unshift(1))));
console.log('07 JSON.stringify(mk().pop())', show(() => JSON.stringify(mk().pop())));
console.log('08 JSON.stringify(mk().splice(0, 1))', show(() => JSON.stringify(mk().splice(0, 1))));
console.log('09 JSON.stringify(mk().push(1))', show(() => JSON.stringify(mk().push(1))));
console.log('10 JSON.stringify((function () { const a: a', show(() => JSON.stringify((function () { const a: any = [1]; Object.freeze(a); try { a.sort(); return 'no-throw'; } catch (e: any) { return e.constructor.name; } })())));
