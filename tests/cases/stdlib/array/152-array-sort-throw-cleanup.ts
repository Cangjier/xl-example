// xl:title 比较器抛异常之后数组停在哪儿
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [3, 1, 2];
try {
  a.sort((x: any, y: any) => { if (x === 1 || y === 1) throw new Error("boom"); return x - y; });
} catch (e: any) { console.log("caught", e.message); }
console.log(a.length, a.every((v: any) => typeof v === "number"));
