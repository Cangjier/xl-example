// xl:title 函数体里的 `var` 提升（声明前读到 undefined）
// xl:round 305
// xl:judge stdout
// xl:end

function f(): number {
  console.log(typeof v);
  var v = 1;
  return v;
}
console.log(f());
