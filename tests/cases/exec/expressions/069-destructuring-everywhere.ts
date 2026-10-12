// xl:title 解构：参数、默认、重命名、嵌套、rest、for-of、catch
// xl:round 371
// xl:judge stdout
// xl:end
function f({ a, b: { c } = { c: 0 } }: any, [x, y = 2, ...rest]: number[] = [1]): string {
  return [a, c, x, y, rest.length].join(",");
}
const { p, q: renamed = 5, ...others } = { p: 1, r: 2, s: 3 } as any;
for (const [k, v] of [["a", 1], ["b", 2]] as [string, number][]) { }
try { throw { code: 7, info: { msg: "m" } }; } catch ({ code, info: { msg } }: any) { console.log(code, msg); }
console.log(f({ a: 1, b: { c: 2 } }, [3, 4, 5]), p, renamed, JSON.stringify(others));
