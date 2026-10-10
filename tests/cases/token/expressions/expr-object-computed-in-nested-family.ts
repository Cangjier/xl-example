// xl:note 值位对象字面量里**再嵌一层**的花括号（第 952 轮）：里层那个 `{` 往回扫撞上的是
// **属性那个 `:`**，位置判据在它自己那一层只会答「类型位」——真正分开类型与值的是**外面那一层**
// （`const o = {` 还是 `type Q = {`）。判据沿「**直接嵌着的表达式花括号**」链爬到最外面那一格再问，
// 两处停：父亲不是花括号（`(` / `:` 那里类型重新进场），或者父亲不是「表达式里的 `{`」
// （`declare module "os" { … }` 的模块体——实测那儿顺着爬会把真映射类型判掉）。
// xl:round 952
// xl:expect ObjectLiteral:5,MappedType:2,TypeLiteral:3,TypeParameter:2,BinaryOperator:2,ArrayLiteral:4
// xl:end
const o = { a: { [K in T]: X } };
const p = { a: { b: { [K in T]: X } } };
type Q = { a: { [K in T]: X } };
type R = { a: { b: { [K in T]: X } } };
