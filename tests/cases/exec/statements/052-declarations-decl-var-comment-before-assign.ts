// xl:title AST 语料 declarations/decl-var-comment-before-assign.ts：decl var comment before assign
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Let,AreaAnnotation
//  xl:note 名字与 `=` 之间夹注释：名字那一格仍然认得出来
let b /* c */ = 2;
console.log(b);
