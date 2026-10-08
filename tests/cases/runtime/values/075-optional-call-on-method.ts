// xl:title o.m?.()：方法取出来是 null 就不调
// xl:judge stdout
// xl:end

const o: any = { m: () => "called", n: null };
console.log(o.m?.(), o.n?.());
