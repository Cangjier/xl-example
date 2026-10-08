// xl:title switch 没有 default / 只有 default / 空体
// xl:judge stdout
// xl:end

function f(n: number): string {
  let out = "";
  switch (n) {
    case 1: out += "one";
    case 2: out += "two"; break;
    case 3: out += "three";
  }
  return out === "" ? "none" : out;
}
function g(n: number): string { switch (n) { default: return "d"; } }
function h(): string { switch (1) { } return "empty"; }
console.log(f(1), f(2), f(3), f(9), g(1), h());
