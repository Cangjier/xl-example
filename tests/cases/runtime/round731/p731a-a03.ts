// xl:title 内建方法自己那两格（`call` / `apply` / `bind` / `toString` 那一族）
// xl:round 731
// xl:judge stdout
// xl:want differ
// xl:why **内建函数身上没有 `name`**（`length` 有）：`Function.prototype.call.name` 在 Node 里是
// xl:why `"call"`、`Math.max.name` 是 `"max"`、`Object.prototype.toString.name` 是 `"toString"`，
// xl:why 本仓一律给 `undefined`。**两档的原因不同、要一起做**：
// xl:why ① `Function.prototype.call` 那一族是**带可调用载荷的对象**（`MethodObject`）——
// xl:why 它的 `length` 是挂上去的（第 350 轮），`name` **没人挂**（挂一处要一个名字参数，
// xl:why 而 `MethodObject` 的签名里没有它）；
// xl:why ② `Math.max` 那一族是**宿主引用值**（`HostRef`）——它们**连属性表都没有**，
// xl:why 要给几百个内建各配一份「名字 + 形参个数」表。
// xl:why 与 `stdlib/round709/p709b-b17` / `p709b-b18`、`stdlib/round719/p719a-m09`、
// xl:why `exec/round706/p706c-x20`、`stdlib/object/122-names-function-proto` **同一条根**，
// xl:why 这一条把其中**已经能挂**的那一半（`MethodObject` 那一族）也点出来了。要做。
// xl:end
console.log(Function.prototype.call.name, Function.prototype.apply.name, Function.prototype.bind.name);
console.log(Object.prototype.toString.name, Object.prototype.hasOwnProperty.name);
console.log(Math.max.name, JSON.stringify(Math.max.name), Math.random.name);
