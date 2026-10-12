// xl:title `var` 在块里声明、在块外可见（函数作用域）
// xl:round 305
// xl:judge stdout
// xl:end

function f(): string {
  if (true) { var inside = 1; }
  return "v" + inside;
}
console.log(f());
