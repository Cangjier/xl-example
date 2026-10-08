// xl:title 闭包捕获 `case` 块里的 `let`
// xl:round 742
// xl:judge stdout
// xl:end
function f(): string {
  const fs: (() => string)[] = [];
  switch (1) {
    case 1: { let v = "v1"; fs.push(() => v); break; }
    default: { let v = "vd"; fs.push(() => v); }
  }
  return fs.map((g) => g()).join(",");
}
console.log(f());
