// xl:title AST 语料 declarations/decl-var-comment-before-annotation.ts：decl var comment before annotation
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Let,TypeDefine,AreaAnnotation
//  xl:note 名字与类型标注的 `:` 之间夹注释
let c /* c */: number = 3;
console.log(c);
