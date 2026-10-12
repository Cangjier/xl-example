// xl:title 函数重载：实现体是唯一跑的那一份
// xl:round 323
// xl:judge stdout
// xl:end

function fmt(v: number): string;
function fmt(v: string): string;
function fmt(v: any): string { return typeof v === "number" ? v.toFixed(2) : v.toUpperCase(); }
console.log(fmt(1.5), fmt("ab"));
