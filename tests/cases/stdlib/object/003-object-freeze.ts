// xl:title Object.freeze / isFrozen：属性写不动、加不上
// xl:judge stdout
// xl:end

const o: any = Object.freeze({ a: 1 });
o.a = 2;
o.b = 3;
console.log(o.a, o.b, Object.isFrozen(o), Object.isFrozen({}));
