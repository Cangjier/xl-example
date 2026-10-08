// xl:title `flat` 的深度与 `Infinity`
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, [2, [3, [4]]]];
console.log(JSON.stringify(a.flat()));
console.log(JSON.stringify(a.flat(2)));
console.log(JSON.stringify(a.flat(Infinity)));
