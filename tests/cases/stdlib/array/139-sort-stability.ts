// xl:title 比较器说相等时保持原序（稳定性）
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }, { k: 1, i: 3 }];
console.log(a.sort((x: any, y: any) => x.k - y.k).map((e: any) => e.i).join(","));
