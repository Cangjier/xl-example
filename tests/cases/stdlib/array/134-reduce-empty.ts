// xl:title `reduce` 空数组无初值该抛 `TypeError`
// xl:round 691
// xl:judge stdout
// xl:end
try { ([] as any).reduce((a: any, b: any) => a + b); } catch (e: any) { console.log("empty", e.constructor.name); }
console.log(([] as any).reduce((a: any, b: any) => a + b, 10));
