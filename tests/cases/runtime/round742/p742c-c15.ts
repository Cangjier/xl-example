// xl:title 带标签的块与 `break blk`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "";
  blk: { out += "a"; if (x) break blk; out += "b"; }
  out += "c";
  return out;
}
console.log(f(0), f(1));
