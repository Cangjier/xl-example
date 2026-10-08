// xl:title AST 语料 declarations/decl-function-comment-before-params.ts：decl function comment before params
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:expect Function,FunctionBody,AreaAnnotation
//  xl:note 函数名与形参表之间夹注释
function g /* c */(a: number): void { console.log(a); }
g(1);
