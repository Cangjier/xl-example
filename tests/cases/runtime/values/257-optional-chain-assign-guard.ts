// xl:title 可选链的短路口径：成员 / 调用 / 下标 / 与 ?? 混用
// xl:round 9
// xl:judge stdout
// xl:end

const o: any = { a: { b: () => 1 } };
console.log(o?.a?.b?.(), o?.x?.y?.(), o?.["a"]?.["b"]?.());
const n: any = null;
console.log(n?.a ?? "fallback", n?.[0] ?? "idx", n?.() ?? "call");
let hits = 0;
const side = () => { hits += 1; return { v: 1 }; };
console.log(side()?.v, hits);
