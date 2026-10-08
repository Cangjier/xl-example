// xl:title fallthrough 落进**带条件的块**
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  switch (x) {
    case 1: out += "1";
    case 2: { out += "2"; if (x === 1) break; }
    case 3: out += "3"; break;
  }
  return out;
}
console.log(f(1), f(2), f(3), f(4));
