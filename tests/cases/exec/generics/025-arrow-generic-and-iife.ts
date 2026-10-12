// xl:title 泛型箭头与带类型标注的立即调用
// xl:round 323
// xl:judge stdout
// xl:end

const id = <T,>(v: T): T => v;
console.log(id("x"), ((a: number, b: number) => a + b)(1, 2));
console.log(((a: string) => a.toUpperCase())("ab"));
