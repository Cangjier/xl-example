// xl:title Object.assign 的多源、覆盖与返回目标
// xl:round 304
// xl:judge stdout
// xl:end

const target = { a: 1 };
const out = Object.assign(target, { b: 2 }, { a: 9 }, null as any, undefined as any);
console.log(out === target, JSON.stringify(target), Object.keys(target).join(","));
console.log(JSON.stringify(Object.assign({}, "ab")));
