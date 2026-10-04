// xl:note 标签模板处在运算符的左脊柱上：`tag`abc` + 1`（第 176 轮 · 投影 0d 支）
// xl:expect String,BinaryOperator,PropertyAccess
const a = tag`abc` + 1;
const b = tag`abc`.length + 1 + 2;
const c = tag`a${x}b` === tag`a${x}b`;
