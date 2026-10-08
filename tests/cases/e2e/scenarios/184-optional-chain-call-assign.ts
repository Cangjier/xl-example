// xl:title 端到端：可选链的三种后缀 + 空值合并赋值 + 逻辑赋值
// xl:round 639
// xl:judge stdout
// xl:end

type Cfg = { a?: { b?: { run?: (x: number) => number } } };
const c: Cfg = { a: { b: { run: (x) => x + 1 } } };
const empty: Cfg = {};
console.log(c.a?.b?.run?.(1));
console.log(empty.a?.b?.run?.(1) ?? "none");
let n: number | null = null;
n ??= 5;
n ||= 9;
n &&= n + 1;
let z = 0;
z ||= 7;
console.log(n, z);
const arr: Array<{ f?: () => number }> = [{}, { f: () => 3 }];
console.log(arr[1]?.f?.(), arr[0]?.f?.() ?? -1);
