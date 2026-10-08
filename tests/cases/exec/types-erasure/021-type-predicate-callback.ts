// xl:title 类型谓词写在回调与箭头里
// xl:round 304
// xl:judge stdout
// xl:end

function isString(v: unknown): v is string { return typeof v === "string"; }
const mixed: unknown[] = [1, "a", true, "b"];
console.log(mixed.filter(isString).join(","));
const isNum = (v: unknown): v is number => typeof v === "number";
console.log(mixed.filter(isNum).length);
