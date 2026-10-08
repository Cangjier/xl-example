// xl:title Math 常量族逐个读描述符
// xl:round 709
// xl:judge stdout
// xl:end
const names = ["PI", "E", "LN2", "LN10", "LOG2E", "LOG10E", "SQRT2", "SQRT1_2"];
let out = "";
for (const n of names) { const d: any = Object.getOwnPropertyDescriptor(Math, n); out = out + n + "=" + d.writable + d.enumerable + d.configurable + " "; }
console.log(out.trim());
