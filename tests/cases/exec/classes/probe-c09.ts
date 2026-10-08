// xl:title (class A { static { A.y = 2; } }).y
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why **类表达式**的静态块里那个类名**没绑上**：`class A { static { A.y = 2; } }`（声明）是好的，`(class A { static { A.y = 2; } })`（表达式）里 `A` 不是类自己 ⇒ 赋值落到一个原始值上、报 `assigning a property on a primitive receiver`。JS 里类表达式**也**在自己的类体里绑类名。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((class A { static { A.y = 2; } }).y));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
