// xl:title `undefined` 与 `case void 0` / `case null`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: any): string {
  switch (x) {
    case void 0: return "undef";
    case null: return "null";
    default: return "other";
  }
}
console.log(f(undefined), f(null), f(0));
