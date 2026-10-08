// xl:title valueOf / toString 在强制转换里的顺序
// xl:round 371
// xl:judge stdout
// xl:end
const o = { valueOf() { return 3; }, toString() { return "T"; } };
console.log(o + 1, String(o), `${o}`, Number(o));
const onlyToString = { toString() { return "9"; } };
console.log(onlyToString + 1, Number(onlyToString));
const sym = { [Symbol.toPrimitive](hint: string) { return hint; } };
console.log(`${sym}`, sym + "", +sym);
