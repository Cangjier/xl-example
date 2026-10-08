// xl:title 对象的整体操作：`preventExtensions` / `freeze` 在嵌套与数组上
// xl:round 750
// xl:judge stdout
// xl:end
const o: any = { a: { b: 1 } };
Object.preventExtensions(o);
o.c = 1;
console.log("c" in o, Object.isExtensible(o), delete o.a, "a" in o);
const deep: any = { a: { b: 1 } };
Object.preventExtensions(deep);
deep.a.b = 2;
console.log(deep.a.b);
const a: any = [1, 2];
Object.freeze(a);
console.log(Object.isFrozen(a), Object.isFrozen([1]), Object.isFrozen({}));
a[0] = 9;
try { a.push(3); } catch (e) { console.log("push", (e as Error).constructor.name); }
console.log(JSON.stringify(a), a.length);
console.log(Object.isExtensible(Object.freeze({})), Object.isSealed(Object.freeze({})));
