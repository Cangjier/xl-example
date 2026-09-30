// xl:expect Let,String
// xl:note 普通双引号串里的 `{` **不是**内插：模板字符串的内插不靠前缀，
// 由 `String.Default` 第 6 条分支在 `{` 处按「前一个字符是 `$` 且引号是反引号」自己判，
// 所以这条用例里没有 InterpolationString，`{y}` 是常量文本
const a = "x{y}z"
