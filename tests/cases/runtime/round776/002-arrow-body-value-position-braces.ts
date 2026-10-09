// xl:title 箭头函数的体里：值位的花括号照旧是对象字面量（守卫）
// xl:round 776
// xl:judge stdout
// xl:end
// 第 776 轮把 `LamdaBody` 补进 `IsStatementList`（判据只影响「这个 `{` 在不在语句位」）。
// 这一条是那次改动的**反向守卫**：箭头体里**值位**的那些花括号一个都不许被带偏——
// `() => ({ … })`（括号化的对象）、`() => { return { … } }`、`=> { const o = { … } }`、
// 箭头体里的**类型字面量**（`x as { … }`）与**解构模式**（`({ a }) => …`）。
const show = (f: () => any): string => {
  try { return "ok:" + String(f()); } catch (e) { return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?"); }
};
console.log('01 括号化的对象体', show(() => { const f = () => ({ a: 1 }); return f().a; }));
console.log('02 括号化的对象体 + 箭头体里的块', show(() => { const f = () => { const g = () => ({ b: 2 }); { return g().b; } }; return f(); }));
console.log('03 return 一个对象字面量', show(() => { const f = () => { return { c: 3 }; }; return f().c; }));
console.log('04 箭头体里的对象字面量变量', show(() => { const f = () => { const o = { d: 4 }; return o.d; }; return f(); }));
console.log('05 箭头体里的嵌套对象', show(() => { const f = () => { const o = { e: { f: 5 } }; return o.e.f; }; return f(); }));
console.log('06 箭头体里当实参的对象', show(() => { const f = () => { return JSON.stringify({ g: 6 }); }; return f(); }));
console.log('07 箭头体里的块 + 对象两种同现', show(() => { const f = () => { let log = ""; { log += "blk"; } const o = { h: 7 }; { log += o.h; } return log; }; return f(); }));
console.log('08 箭头形参的解构模式', show(() => { const f = ({ i }: any) => { return i; }; return f({ i: 8 }); }));
console.log('09 箭头体里的类型字面量断言', show(() => { const f = () => { const v = { j: 9 } as { j: number }; return v.j; }; return f(); }));
console.log('10 箭头体里的对象里套函数', show(() => { const f = () => { const o = { k() { return 10; } }; return o.k(); }; return f(); }));
console.log('11 箭头体里的块后紧跟对象', show(() => { const f = () => { { } const o = { l: 11 }; return o.l; }; return f(); }));
console.log('12 箭头体里的块包着对象', show(() => { const f = () => { { const o = { m: 12 }; return o.m; } }; return f(); }));
console.log('13 箭头体里 return 块形状的字面量', show(() => { const f = () => { return { n: { o: 13 } }; }; return f().n.o; }));
console.log('14 已标注返回类型的箭头', show(() => { const f = (): number => { const o = { p: 14 }; return o.p; }; return f(); }));
console.log('15 箭头体里的 for/of 解构', show(() => { const f = () => { let sum = 0; for (const { q } of [{ q: 15 }]) { sum += q; } return sum; }; return f(); }));
