// xl:title JSON 深结构与特殊值：undefined、函数、稀疏数组
// xl:round 371
// xl:judge stdout
// xl:end
const deep: any = { a: { b: { c: { d: [1, [2, [3, [4]]]] } } } };
console.log(JSON.stringify(deep));
console.log(JSON.stringify({ u: undefined, f: () => 0, n: null }));
const sparse: any[] = [1, , 3];
console.log(JSON.stringify(sparse), JSON.stringify(Array.from(sparse)));
console.log(JSON.stringify({ d: new Date(0) }));
console.log(JSON.stringify({ nested: { arr: [{ x: 1 }, { y: [true, false] }] } }));
