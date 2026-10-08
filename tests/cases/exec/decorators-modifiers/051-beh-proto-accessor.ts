// xl:title __proto__ 这个访问器读与写
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why `__proto__` 这个访问器没装（第 678 轮（其一）在 `Object.prototype` 的成员名单里量到它取不到）：读 `o.__proto__` 给 `undefined`、写 `o.__proto__ = proto` 也不改链 ⇒ 它该是 `getPrototypeOf` / `setPrototypeOf` 的访问器外壳，而这两个静态方法**本身是好的**（`getPrototypeOf` 那条 pass）
// xl:end

const proto = { greet: "hi" };
const o: any = {};
o.__proto__ = proto;
console.log(o.greet, o.__proto__ === proto);
console.log(Object.getPrototypeOf(o) === proto);
