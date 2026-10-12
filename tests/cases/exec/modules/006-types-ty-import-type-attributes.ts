// xl:title AST 语料 types/ty-import-type-attributes.ts：ty import type attributes
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 导入类型也带导入属性：`import("m", { with: { type: "json" } })` 的属性是 ImportType 的 attributes
//  xl:expect ImportType,ObjectLiteral
type J = import("./d.json", { with: { type: "json" } }).default;
type K = import("./d.json").default;
let a: J;
let b: K;
console.log(1);
