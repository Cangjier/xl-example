// xl:title `arguments.callee` 与「标记格不进 Object.keys」
// xl:round 702
// xl:judge stdout
// xl:end
function f(a: number): void {
  console.log(typeof arguments.callee, arguments.callee === f);
  console.log(Object.keys(arguments).join(","));
  console.log(arguments.hasOwnProperty("callee"));
}
f(1, 2);
function g(): void {
  console.log(arguments.length, arguments[1]);
}
g(7, 8, 9);
