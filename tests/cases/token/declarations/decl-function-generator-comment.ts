// xl:expect Function,FunctionBody,AreaAnnotation
// xl:note `function` 与 `*` 之间夹注释
function /* c */ *h() { yield 1; }
for (const v of h()) { console.log(v); }
