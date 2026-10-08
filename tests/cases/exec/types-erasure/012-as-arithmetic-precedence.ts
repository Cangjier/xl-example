// xl:title as 与二元运算符的优先级：(a as number) + 1
// xl:judge stdout
// xl:end

const a: unknown = 1;
console.log((a as number) + 1, (a as number) * 3);
