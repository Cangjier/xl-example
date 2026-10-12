// xl:expect Let,String,ConstString
// xl:absent InterpolationString
// xl:note 模板串里的裸 `{` 是**字面量**：只有 `${` 才是内插起点，所以 `a { b` 里没有 InterpolationString
const a = `a { b`;
