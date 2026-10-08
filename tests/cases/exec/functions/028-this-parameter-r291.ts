// xl:title this 形参
// xl:round 291
// xl:judge stdout
// xl:end

function f(this: { n: number }) { return this.n; }
console.log(f.call({ n: 5 }));
