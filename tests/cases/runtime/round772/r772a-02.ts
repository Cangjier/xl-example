// xl:title 调用位上那个 getter 抛错：走的是重入那条路
// xl:round 772
// xl:judge stdout
// xl:end
// `o.g()` 里那次属性读会去调 getter，而 getter 抛出来的东西**不经过** `Guard`
//（它在重入帧上展开）——修法与上面那一条同源：读完先问「帧还在不在原处」。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
const bad = { get g(): any { throw new TypeError("boom"); } };
const badRange = { get h(): any { throw new RangeError("boom"); } };
// **反面哨兵**：getter 自己把那一抛接住了、照常交回一个函数——这次调用**不许**被跳掉
const swallowed = { get k() { try { throw new Error("inner"); } catch { /* swallowed */ } return () => 11; } };
const inner = { get n() { try { (undefined as any).boom(); } catch { /* swallowed */ } return () => 12; } };
console.log('01 o.g()', show(() => bad.g()));
console.log('02 o.h()', show(() => badRange.h()));
console.log('03 之后照旧', show(() => "after"));
console.log('04 自己接住的 getter', show(() => swallowed.k()));
console.log('05 自己接住（里面是空值调用）', show(() => inner.n()));
const plain = { m(a: number) { return a * 2; } };
console.log('06 普通方法', show(() => plain.m(21)));
function inFunction() { const u: any = undefined; return u.x(); }
console.log('07 在函数里（外层接）', show(() => inFunction()));
console.log('08 在函数里（本层接）', show(() => { const u: any = undefined; try { return u.x(); } catch (e) { return "inner-caught:" + (e as any).constructor.name; } }));
