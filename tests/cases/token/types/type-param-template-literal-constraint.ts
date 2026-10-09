// xl:note 泛型约束里是一个模板字面量类型 —— 第 866 轮之前的账、第 867 轮转绿。
// 第 867 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `GenericTypeBranch.ScanArguments` 的**字母表里没有 `` ` ``** —— 扫描在开引号那里当场中止
// ⇒ `<X extends `a${A}b`>` 整段退回**比较运算符**（产物里 `<` / `>` 各自是一个 `LessThanToken` /
// `GreaterThanToken`，整条 `function` 塌成 `BinaryExpression`，缺 14 多 7、还带一处未映射 `Bracket`）。
// 现在 `` ` `` 那一支整段吃掉模板字面量（`${ … }` 递归到 `SkipTemplateExpression`，
// 花括号 / 字符串 / 注释 / 嵌套模板都在里面），`>` 不再参与尖括号计数。
// 实测 `tmp/r867/template-type.mjs` 18 条全绿（函数 / 方法 / 箭头 / 类 / 接口 / `type` 别名 /
// 联合约束 / 默认值位，以及不带插值的 `` `ab` `` 与四条对照）。
// xl:expect Keyword,String,InterpolationString
function f14<X extends `a${A}b`>(x: X): X { return x; }
