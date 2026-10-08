// xl:title 嵌套作用域、遮蔽、与枚举/常量在内层
// xl:round 371
// xl:judge stdout
// xl:end
const name = "outer";
function f(): string {
  const name = "inner";
  {
    const name = "block";
    if (true) {
      const name = "if";
      return name;
    }
  }
  return name;
}
let counter = 0;
for (let i = 0; i < 2; i++) { counter += i; }
console.log(f(), name, counter, (() => { const name = "arrow"; return name; })());
