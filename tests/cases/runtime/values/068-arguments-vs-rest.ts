// xl:title arguments 与剩余形参同时存在
// xl:judge stdout
// xl:end

function f(a: number, ...rest: number[]) {
  return rest.join("+") + ":" + arguments.length;
}
console.log(f(1, 2, 3), f(1), f());
