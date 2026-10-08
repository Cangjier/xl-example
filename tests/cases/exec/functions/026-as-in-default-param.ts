// xl:title 默认值里写 as
// xl:judge stdout
// xl:end

function f(x = 1 as number) {
  return x;
}
console.log(f(), f(2));
