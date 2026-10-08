// xl:expect Function,Let,String,ConstString,InterpolationString
// xl:absent InterpolationGuide
// xl:note 带标签的模板串 `tag\`x${1}y\``：模板串本身照常成形（String + InterpolationString），
// 标签 `tag` 是它前面的那个名字，不改变模板串的内部结构
declare function tag(s: TemplateStringsArray, ...v: unknown[]): string;
const a = tag`x${1}y`;
