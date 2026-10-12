// xl:title 重载签名擦除、只剩实现
// xl:round 291
// xl:judge stdout
// xl:end

function f(a: number): number;
function f(a: string): string;
function f(a: any): any { return a; }
console.log(f(1), f("s"));
