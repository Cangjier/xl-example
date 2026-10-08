// xl:title `fromEntries` 与 `entries` 往返，含符号键
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = Symbol("k");
const m: any = new Map<any, any>([[s, 1], ["a", 2]]);
const o: any = Object.fromEntries(m);
console.log(o[s], o.a);
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(Object.fromEntries([["x", 1]])));
