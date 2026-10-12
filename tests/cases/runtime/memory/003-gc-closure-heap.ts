// xl:title 闭包环境也是堆对象：被捕获的变量活到闭包死
// xl:judge stdout
// xl:end

function make(): () => number {
  let n = 0;
  const bump = () => ++n;
  for (let i = 0; i < 5000; i++) { const junk = { i }; }
  return bump;
}
const f = make();
console.log(f(), f(), f());
