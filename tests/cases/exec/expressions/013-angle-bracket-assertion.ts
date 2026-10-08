// xl:title 尖括号断言 `<T>expr`（与 `as` 同一个意思）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const v: any = "abc";
console.log((<string>v).length, (<number>(<any>1)) + 1);
