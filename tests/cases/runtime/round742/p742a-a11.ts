// xl:title 空 `case` 合并与空 `switch`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1:
    case 2: return "1or2";
    case 3:
    default: return "other";
  }
}
console.log(f(1), f(2), f(3), f(4));
let hit = 0;
switch (9) { }
console.log(hit);
