// xl:title 带标签的 `switch` 与 `break lbl`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  lbl: switch (x) {
    case 1: out += "1"; break lbl;
    default: out += "d";
  }
  out += "!";
  return out;
}
console.log(f(1), f(2));
