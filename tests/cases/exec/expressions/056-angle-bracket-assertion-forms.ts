// xl:title 尖括号断言：变量、字面量、嵌套三格
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const a: unknown = "x";
const b = <string>a;
const c = <any>(1 as any) + 1;
console.log(b, c, (<number>(2 as any)) * 3);
