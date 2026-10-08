// xl:title `delete` 落在可选链与计算键上
// xl:judge stdout
// xl:end

const o: any = { a: { b: 1 }, c: 2 };
console.log(delete o?.a?.b, o.a.b);
console.log(delete o?.zzz, delete o["c"], Object.keys(o).join(","));
