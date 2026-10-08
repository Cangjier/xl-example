// xl:title `default` 写在前头、匹配后**往下落进后面的 `case`**
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  switch (x) {
    default: out += "D";
    case 1: out += "1"; break;
    case 2: out += "2";
  }
  return out;
}
console.log(f(1), f(2), f(3));
