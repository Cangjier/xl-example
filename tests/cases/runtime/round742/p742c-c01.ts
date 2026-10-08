// xl:title 只有 `default` 的 `switch`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) { default: return "d"; }
}
console.log(f(0), f(1));
