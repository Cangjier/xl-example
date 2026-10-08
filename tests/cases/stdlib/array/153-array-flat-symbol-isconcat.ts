// xl:title `flat` 与 `Symbol.isConcatSpreadable` 无关（只认数组）
// xl:round 691
// xl:judge stdout
// xl:end
const nested: any = [1, [2, [3]]];
console.log(JSON.stringify(nested.flat(1)));
console.log(JSON.stringify(nested.flat(0)));
console.log(JSON.stringify([].flat()));
