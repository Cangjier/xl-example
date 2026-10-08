// xl:title toSpliced / toReversed / toSorted / with 不改原数组
// xl:round 371
// xl:judge stdout
// xl:end
const xs = [3, 1, 2];
console.log(JSON.stringify(xs.toSorted()), JSON.stringify(xs.toSorted((a: number, b: number) => b - a)));
console.log(JSON.stringify(xs.toReversed()), JSON.stringify(xs.with(1, 9)));
console.log(JSON.stringify(xs.toSpliced(1, 1, 7, 8)));
console.log(JSON.stringify(xs));
try { console.log(JSON.stringify(xs.with(9, 0))); } catch (e) { console.log((e as Error).name); }
