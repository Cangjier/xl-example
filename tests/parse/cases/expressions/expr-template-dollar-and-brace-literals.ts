// xl:expect Let,String,InterpolationString
// xl:note 模板字符串的三个边界：`$` 后面不是 `{` 时 `$` 是字面量；
// `{` 前面不是 `$` 时 `{` 是字面量；两个内插之间的文本要留在常量块里
const a = `x$y{${b}z}`
