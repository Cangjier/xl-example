// xl:title `toSorted` / `toReversed` / `with`（不改原数组）
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [3, 1, 2];
console.log(JSON.stringify(a.toSorted()));
console.log(JSON.stringify(a.toReversed()));
console.log(JSON.stringify(a.with(1, 9)));
console.log(JSON.stringify(a));
