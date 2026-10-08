// xl:title readonly 数组 / 元组 / 只读参数不影响运行期
// xl:round 371
// xl:judge stdout
// xl:end
const ro: readonly number[] = [1, 2, 3];
const tup: readonly [string, number, ...boolean[]] = ["a", 1, true];
function consume(xs: readonly string[]): number { return xs.length; }
const opt: [number, string?] = [1];
const named: [first: number, second: string] = [2, "s"];
console.log(ro.length, tup.length, consume(["a"]), opt.length, named.join(","));
console.log([...ro].join("-"), ro.map((v) => v * 2).join(","));
