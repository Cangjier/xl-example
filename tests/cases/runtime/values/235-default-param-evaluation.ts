// xl:title 默认参数：表达式每次调用求值、靠 arguments.length 区分「没传」与「传 undefined」
// xl:round 7
// xl:judge stdout
// xl:end

let calls = 0;
function f(a: number, b: number = ++calls): string {
  return a + ":" + b + ":" + arguments.length;
}
console.log(f(1), f(1, 5), f(1, undefined), calls);
