// xl:title toArray 交的是**普通数组**（不挂 next），接收者被抽干
// xl:round 725
// xl:judge stdout
// xl:end
const it: any = [1, 2, 3].values();
const plain: any = it.toArray();
console.log(Array.isArray(plain), plain.join(","), typeof plain.next, it.next().done);
const t: any = [1, 2, 3].values();
const one: any = t.take(1);
console.log(typeof one.next, one.next().value, JSON.stringify(one.next()));
console.log([...([1, 2, 3].values() as any).take(2)].join(","));
