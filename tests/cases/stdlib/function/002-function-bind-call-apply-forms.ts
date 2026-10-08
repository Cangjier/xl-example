// xl:title bind / call / apply 与绑定后的 name / length
// xl:round 291
// xl:judge stdout
// xl:end

function f(this: any, a: number, b: number) { return this.base + a + b; }
const bound = f.bind({ base: 10 }, 1);
console.log(bound(2), bound.length, bound.name);
console.log(f.call({ base: 100 }, 1, 2), f.apply({ base: 0 }, [1, 2]));
