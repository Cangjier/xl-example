// xl:title 闭包：两个计数器各拿一份环境
// xl:judge stdout
// xl:end

function makeCounter() {
  let n = 0;
  return () => ++n;
}
const a = makeCounter();
const b = makeCounter();
console.log(a(), a(), b(), a(), b());
