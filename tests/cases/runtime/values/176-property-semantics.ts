// xl:title 属性语义：自有 / 继承 / 访问器 / 缺失 / 原型上的写
// xl:round 371
// xl:judge stdout
// xl:end
const proto: any = { inherited: 1, get computed() { return "p"; } };
const o: any = Object.create(proto);
o.own = 2;
console.log(o.own, o.inherited, o.computed, o.missing, "inherited" in o, Object.hasOwn(o, "inherited"));
o.inherited = 3;
console.log(o.inherited, proto.inherited, Object.hasOwn(o, "inherited"));
const arr = [1, 2, 3];
arr[5] = 6;
console.log(arr.length, arr[4], arr[3], 3 in arr, JSON.stringify(arr));
