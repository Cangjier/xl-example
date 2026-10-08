// xl:expect Let,String,ConstString,InterpolationString
// xl:absent InterpolationGuide
// xl:note 内插里再嵌模板串：两个 String、两个 InterpolationString。
// `InterpolationGuide`（原始内插串 `$"""…"""` 的进入向导）不在这条路上，故断言其不存在
const a = `x${`y${1}z`}w`;
