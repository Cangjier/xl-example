// xl:title 分配式条件类型与运行期判断同形
// xl:round 304
// xl:judge stdout
// xl:end

type IsArray<T> = T extends any[] ? "yes" : "no";
type R1 = IsArray<number[]>;
type R2 = IsArray<number>;
function check(v: unknown): string { return Array.isArray(v) ? "yes" : "no"; }
const a: R1 = "yes";
const b: R2 = "no";
console.log(a, b, check([1]), check(1));
