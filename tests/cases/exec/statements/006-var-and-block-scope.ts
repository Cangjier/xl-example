// xl:title `var` 提升到函数、`let` 停在块里
// xl:judge stdout
// xl:end

function f(): string {
  if (true) { var v = 1; let l = 2; }
  return "v=" + v;
}
console.log(f(), typeof l);
