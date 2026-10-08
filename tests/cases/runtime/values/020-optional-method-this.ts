// xl:title `o.m?.()`：守的是取出来的方法，`this` 仍是 `o`
// xl:judge stdout
// xl:end

const o: any = { n: 5, m() { return this.n * 2; }, z: null };
console.log(o.m?.(), o.z?.(), o.missing?.());
