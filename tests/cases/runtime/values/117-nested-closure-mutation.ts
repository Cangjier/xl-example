// xl:title 三层闭包改同一个变量
// xl:round 304
// xl:judge stdout
// xl:end

function outer() {
  let n = 0;
  return function middle() {
    return function inner() {
      n += 1;
      return n;
    };
  };
}
const mid = outer();
const a = mid();
const b = mid();
console.log(a(), a(), b(), a());
