// xl:title 三千层递归不爆宿主栈（引擎的硬性约定第 2 条）
// xl:judge stdout
// xl:end

function depth(n: number): number { return n === 0 ? 0 : 1 + depth(n - 1); }
console.log(depth(3000));
function sum(n: number): number { return n === 0 ? 0 : n + sum(n - 1); }
console.log(sum(2000));
