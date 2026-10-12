// xl:title `Map` 的键相等：`NaN` 与 `-0`
// xl:round 691
// xl:judge stdout
// xl:end
const m: any = new Map<any, any>();
m.set(NaN, "nan"); m.set(-0, "zero");
console.log(m.get(NaN), m.get(0), m.size);
const s: any = new Set<any>([NaN, NaN, -0, 0]);
console.log(s.size);
