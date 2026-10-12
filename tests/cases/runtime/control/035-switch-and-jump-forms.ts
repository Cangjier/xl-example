// xl:title switch 的严格相等、贯穿、与表达式求值次数
// xl:round 371
// xl:judge stdout
// xl:end
function classify(v: unknown): string {
  switch (v) {
    case "1": return "string-1";
    case 1: return "number-1";
    case true: return "true";
    case null: return "null";
    case undefined: return "undefined";
    default: return "other";
  }
}
console.log(classify("1"), classify(1), classify(true), classify(null), classify(undefined), classify(0));
let evaluated = 0;
function pick(v: number): number { evaluated += 1; return v; }
switch (pick(2)) {
  case 1: console.log("one"); break;
  case 2:
  case 3: console.log("two-or-three"); break;
  default: console.log("default");
}
console.log(evaluated);
