// xl:ts-invalid
// xl:expect Let,String,InterpolationString
// xl:note 回归护栏：`$` 从符号表里去掉之后，`$"…{…}…"` 的内插前缀必须照旧工作。
// 前缀识别走的是「回看字符 + Undo」，不依赖符号表，所以两件事互不影响。
// `$"…"` 是本项目语言（Cangjie）的内插写法、不是 TypeScript，故标记 ts-invalid
const s = $"a{1}b"
