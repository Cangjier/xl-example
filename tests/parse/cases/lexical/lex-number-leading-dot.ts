// xl:note 小数点开头的小数是一个字面量：`Symbol` 只剩 `=`（`;` 本来就不进产物，`.` 不该单独成符号）
// xl:expect Let,Common,Symbol:1
const a = .5;
