// xl:title 函数的 length：默认值与剩余形参都不算
// xl:judge stdout
// xl:end

function a(x: number, y: number) {}
function b(x: number, y = 1) {}
function c(x: number, ...r: number[]) {}
console.log(a.length, b.length, c.length);
