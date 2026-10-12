// xl:title AST 语料 declarations/decl-function-generator-comment.ts：decl function generator comment
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Function,FunctionBody,AreaAnnotation
//  xl:note `function` 与 `*` 之间夹注释
function /* c */ *h() { yield 1; }
for (const v of h()) { console.log(v); }
