// xl:note 内插里再嵌模板串
// xl:expect String,InterpolationString
// xl:absent ObjectLiteral
const s = `a${`b${c}d`}e`;
