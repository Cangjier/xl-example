// xl:title 集合的条目不是自有属性（Object.keys 给空）
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map([["a", 1]]);
const s = new Set([1]);
console.log(Object.keys(m as any).length, (m as any).a, Object.keys(s as any).length);
console.log(m.size, s.size);
