// xl:title `switch` 的 fallthrough：`break` 缺一格的三种落法
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: out += "one";
    case 2: out += "two"; break;
    case 3: out += "three";
    default: out += "d";
  }
  return out;
}
console.log(f(1), f(2), f(3), f(4), f(5));
