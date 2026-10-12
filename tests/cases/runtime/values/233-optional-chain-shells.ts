// xl:title 可选链的壳：?.() 调用、?.[] 索引、delete 与赋值里不许用（语法层）
// xl:round 7
// xl:judge stdout
// xl:end

const o: any = { f: (n: number) => n + 1, arr: [1, 2] };
const n1: any = null;
console.log(o?.f(1), n1?.f(1), o?.arr?.[0], n1?.arr?.[0]);
console.log(n1?.["x"]?.y ?? "fallback", o?.missing?.deep?.deeper);
delete o?.arr;
console.log(Array.isArray(o.arr), o.arr === undefined);
