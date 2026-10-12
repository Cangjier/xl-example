// xl:title AST 语料 expressions/expr-template-nested-spaced.ts：expr template nested spaced
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 内插表达式与 `}` 之间有空白的嵌套模板：TemplateTail 从 `}` 起，不含那个空白
//  xl:expect String,ConstString,InterpolationString
const r = `a${ `b${1}` }c`;
console.log(r);
