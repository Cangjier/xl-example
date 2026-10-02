// xl:note `this` 形参的名字是 Identifier（不是 ThisKeyword）；类型位的 `this` 才是 ThisKeyword
// xl:expect Function,Parameter:2,Keyword
function f(this: Window, x: number): void {}
