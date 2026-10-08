// xl:title 可选链接下标：o.a?.[0]?.b
// xl:judge stdout
// xl:end

const o: any = { a: [{ b: 1 }] };
console.log(o.a?.[0]?.b, o.x?.[0]?.b, o.a?.[1]?.b);
