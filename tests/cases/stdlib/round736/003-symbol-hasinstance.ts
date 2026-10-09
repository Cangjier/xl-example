// xl:title `instanceof` 与自定义 `Symbol.hasInstance`
// xl:round 736
// xl:judge stdout
// xl:end
class Even {
  static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
}
console.log(2 instanceof Even, 3 instanceof Even, "x" instanceof Even);
const f: any = { [Symbol.hasInstance](v: any) { return v === 1; } };
console.log(1 instanceof f, 2 instanceof f);
