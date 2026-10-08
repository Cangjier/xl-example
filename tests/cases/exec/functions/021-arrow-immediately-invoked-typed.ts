// xl:title 带类型标注的箭头立即调用
// xl:judge stdout
// xl:end

console.log(((a: number, b: number) => a + b)(1, 2));
