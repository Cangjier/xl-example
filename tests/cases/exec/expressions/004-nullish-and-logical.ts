// xl:title `??` / `??=` / `||=` / `&&=` 的落点：变量、成员、下标
// xl:judge stdout
// xl:end

let a: any = null;
a ??= 1;
const o: any = { b: 0 };
o.b ||= 2;
o.c ??= 3;
o["d"] ??= 4;
console.log(a, o.b, o.c, o.d);
