// xl:title 默认参数只在 undefined（含 null 的差别）时生效
// xl:round 623
// xl:judge stdout
// xl:end

function f(a = 1, b: any = 2) { return a + "," + b; }
console.log(f(), f(undefined, undefined), f(null, null), f(0, ""));
