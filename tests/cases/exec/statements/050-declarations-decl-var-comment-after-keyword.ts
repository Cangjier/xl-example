// xl:title AST 语料 declarations/decl-var-comment-after-keyword.ts：decl var comment after keyword
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Let,AreaAnnotation
//  xl:note 声明词与名字之间夹注释：整条仍是 Let（注释留在 Let 右边，不丢）
const /* c */ a = 1;
console.log(a);
