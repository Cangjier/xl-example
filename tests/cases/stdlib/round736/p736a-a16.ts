// xl:title `Object.getOwnPropertySymbols` 与 `Object.assign` 带符号键
// xl:round 736
// xl:judge stdout
// xl:end
const k = Symbol("a");
const src: any = { [k]: 1, b: 2 };
const dst: any = {};
Object.assign(dst, src);
console.log(dst[k], Object.keys(dst).join(","), Object.getOwnPropertySymbols(dst).length);
console.log(JSON.stringify(dst));
