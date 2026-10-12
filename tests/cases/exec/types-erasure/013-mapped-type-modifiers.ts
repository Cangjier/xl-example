// xl:title 映射类型带 readonly / 可选修饰
// xl:judge stdout
// xl:end

type M<T> = { readonly [K in keyof T]?: T[K] };
const m: M<{ a: number }> = { a: 1 };
console.log(m.a);
