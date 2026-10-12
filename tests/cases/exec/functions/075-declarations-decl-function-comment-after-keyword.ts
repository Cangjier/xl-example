// xl:title AST 语料 declarations/decl-function-comment-after-keyword.ts：decl function comment after keyword
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Function,FunctionBody,AreaAnnotation
//  xl:note `function` 与函数名之间夹注释
function /* c */ f(a: number): void { console.log(a); }
f(1);
