// xl:title AST 语料 declarations/type-alias-comment-before-equals.ts：type alias comment before equals
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect TypeAssign,AreaAnnotation
//  xl:note 别名与 `=` 之间夹注释
type B /* c */ = string;
let y: B = "s";
console.log(y);
