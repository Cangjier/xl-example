// xl:title 可选调用 / 可选下标 / 空值合并混在一起
// xl:round 7
// xl:judge stdout
// xl:end

type Box = { f?: (n: number) => number; list?: Array<number>; deep?: { g?: () => string } };
const a: Box = { f: (n) => n * 2, list: [5, 6] };
const b: Box = {};
console.log(a.f?.(3) ?? -1, b.f?.(3) ?? -1);
console.log(a.list?.[1] ?? -1, b.list?.[1] ?? -1);
console.log(b.deep?.g?.() ?? "none", a.deep?.g?.() ?? "none");
console.log(a.list?.length ?? 0, (b.list ?? []).length);
