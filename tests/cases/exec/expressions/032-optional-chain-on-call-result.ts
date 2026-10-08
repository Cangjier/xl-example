// xl:title 调用结果上的可选链：f()?.a
// xl:judge stdout
// xl:end

const f = (): any => ({ a: 1 });
console.log(f()?.a, f()?.b?.c);
