// xl:expect Let,String,ConstString,InterpolationString
// xl:absent InterpolationGuide
// xl:note 带内插的模板串：`${1}` 收成一个 InterpolationString，两侧文本留在 ConstString 里。
// 内插**不经过** InterpolationGuide——那条路只服务原始内插串 `$"""…"""`
const a = `x${1}y`;
