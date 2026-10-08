// xl:title sort：稳定性、undefined 排在最后、洞被移到尾部
// xl:round 371
// xl:judge stdout
// xl:end
const rows = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }, { k: 0, n: "d" }];
console.log(rows.slice().sort((x, y) => x.k - y.k).map((r) => r.n).join(""));
const mixed: any[] = [3, undefined, 1, , 2];
console.log(JSON.stringify(mixed.slice().sort()));
console.log(JSON.stringify([10, 9, 100].sort()));
