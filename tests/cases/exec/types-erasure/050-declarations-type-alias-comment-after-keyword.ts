// xl:title AST 语料 declarations/type-alias-comment-after-keyword.ts：type alias comment after keyword
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect TypeAssign,AreaAnnotation
//  xl:note `type` 与别名之间夹注释
type /* c */ A = number;
let x: A = 1;
console.log(x);
