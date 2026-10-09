// xl:title 联合类型收窄的判据全是运行期的 typeof
// xl:round 371
// xl:judge stdout
// xl:end
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number } | string;
function area(x: Shape): number {
  if (typeof x === "string") return x.length;
  if (x.kind === "circle") return 3 * x.r * x.r;
  return x.s * x.s;
}
function describe(v: string | number | null | undefined): string {
  if (v === null) return "null";
  if (v === undefined) return "undef";
  return typeof v === "string" ? "s:" + v : "n:" + v;
}
console.log(area({ kind: "circle", r: 2 }), area({ kind: "square", s: 3 }), area("abcd"));
console.log(describe(null), describe(undefined), describe("x"), describe(1));
