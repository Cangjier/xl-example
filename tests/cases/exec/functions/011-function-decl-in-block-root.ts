// xl:title 块里的函数声明：块内可见、块外不泄漏
// xl:judge stdout
// xl:end

if (true) { function f(): string { return "in if"; } console.log(f()); }
function outer(): string { { function g(): string { return "in block"; } return g(); } }
console.log(outer(), typeof f);
