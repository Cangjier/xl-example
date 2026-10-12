// xl:title switch：贯穿、default 在中间、块级声明
// xl:judge stdout
// xl:end

function run(n: number): string {
  let s = "";
  switch (n) {
    case 1: s += "a";
    case 2: s += "b"; break;
    case 3: { const t = "c"; s += t; break; }
    default: s += "d";
  }
  return s;
}
console.log(run(1), run(2), run(3), run(9));
