// xl:title 判别式是**方法调用的结果**与**模板串**
// xl:round 742
// xl:judge stdout
// xl:end
const o: any = { toString() { return "k"; } };
switch (String(o)) {
  case "k": console.log("K"); break;
  default: console.log("D");
}
function f(x: string): number {
  switch (`${x}!`) {
    case "a!": return 1;
    case "b!": return 2;
  }
  return 0;
}
console.log(f("a"), f("b"), f("c"));
