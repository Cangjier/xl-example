// xl:title AST 语料 declarations/type-alias-comment-export.ts：type alias comment export
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect TypeAssign,AreaAnnotation
//  xl:note `export` 与 `type` 之间夹注释
export type /* c */ D = number;
let w: D = 2;
console.log(w);
