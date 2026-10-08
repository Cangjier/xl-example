// xl:title `arguments` 的标签是 `Arguments`，不是 `Array`
// xl:round 702
// xl:judge stdout
// xl:end
function f(): void {
  console.log(Object.prototype.toString.call(arguments));
  console.log(Array.isArray(arguments), arguments.length, arguments[0]);
}
f(1, 2);
