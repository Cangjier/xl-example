// xl:title 下标调用链当**比较 / 逻辑**的操作数（第 743 轮一并收掉）
// xl:round 743
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const n: any = { f: () => ({ v: 0 }) };
console.log(o["f"]().v === 1, o["f"]().v !== 2);
console.log(o["f"]().v && 2, n["f"]().v || "fallback");
console.log(o["f"]().v ?? 5, n["f"]().v ?? 5);
console.log(o["f"]().v > 0, o["f"]().v < 0);
