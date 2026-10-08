// xl:title void / undefined / 缺失返回值的统一口径
// xl:round 371
// xl:judge stdout
// xl:end
function noReturn(): void { }
function returnsUndefined(): undefined { return undefined; }
console.log(noReturn(), returnsUndefined(), void 0, typeof void 0);
console.log(JSON.stringify(noReturn()), String(noReturn()), noReturn() === undefined);
const o: any = {};
console.log(o.missing, o[undefined as any], o["undefined"]);
function returnsNothing() { if (false) return 1; }
console.log(returnsNothing(), [1].find((v) => v > 5), [].pop(), [].shift());
console.log((() => {})() === undefined, [1, 2].forEach(() => {}) === undefined);
