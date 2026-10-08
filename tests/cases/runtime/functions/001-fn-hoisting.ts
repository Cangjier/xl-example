// xl:title 函数声明与 var 的提升
// xl:judge stdout
// xl:end

console.log(early());
function early(): string { return "hoisted"; }
console.log(typeof later);
var later = 1;
console.log(later);
