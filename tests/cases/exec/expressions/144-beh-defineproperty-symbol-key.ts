// xl:title defineProperty 只收字符串键：symbol 键那一档没有
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {};
const s = Symbol("k");
try {
  Object.defineProperty(o, s, { value: 1, enumerable: true });
  console.log("装了", o[s]);
} catch (e: any) {
  console.log("抛了");
}
Object.defineProperty(o, "plain", { value: 2, enumerable: true });
console.log(o.plain, Object.keys(o).join(","));
