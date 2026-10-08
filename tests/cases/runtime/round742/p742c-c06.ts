// xl:title `case` 里的块：块内 `break` 出的是 `switch`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: { out += "a"; break; }
    default: out += "d";
  }
  out += "z";
  return out;
}
console.log(f(1), f(2));
