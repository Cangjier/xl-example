// xl:title 类型谓词 `v is T` 与断言函数 `asserts v`
// xl:judge stdout
// xl:end

function isString(v: unknown): v is string { return typeof v === "string"; }
function assert(v: unknown): asserts v { if (!v) throw new Error("no"); }
const xs: unknown[] = [1, "a", true, "b"];
console.log(xs.filter(isString).length, xs.filter(isString).join(""));
assert(1);
console.log("asserted");
