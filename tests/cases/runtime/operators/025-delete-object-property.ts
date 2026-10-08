// xl:title delete 对象属性：删掉、in 变假、读回 undefined
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, o.a, Object.keys(o).join(","));
console.log(delete o.missing);
