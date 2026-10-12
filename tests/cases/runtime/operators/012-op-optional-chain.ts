// xl:title `?.` 家族：属性、下标、调用、连成一串
// xl:judge stdout
// xl:end

const o: any = { a: { b: 1 }, m: () => 2, xs: [3] };
console.log(o?.a?.b, o?.z?.b, o?.m?.(), o?.n?.(), o?.xs?.[0], o?.ys?.[9]);
console.log(o.a?.b ?? "d", o.z?.b ?? "d");
