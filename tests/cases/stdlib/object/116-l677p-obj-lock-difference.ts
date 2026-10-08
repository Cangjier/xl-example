// xl:title `preventExtensions` 之后 `defineProperty` 新建一格**两边都抛** `TypeError`
// xl:judge stdout
// xl:note 第 691 轮把这一条的账**翻了过来**：原来记的是「本仓抛（严格模式的选择）、
//       node 松散所以静默」——**那句话量错了**。`Object.defineProperty` 不是赋值，
//       它在**松散模式下照样抛** `TypeError`（规范里 `[[DefineOwnProperty]]` 失败就是抛，
//       与调用方的严格模式无关，只有 `=` 赋值那条路才看模式）。
//       本仓当时抛的是一个**裸 `Error`**，所以两边印出来的名字不同 ⇒ 判 differ；
//       第 691 轮给「不可扩展上新建一格」补了 `cannotDefineOn()`（真的 `TypeError`），
//       两边就逐字相同了。这一条现在钉的是**一致**，不是口径边界。
// xl:end

const frozen = Object.preventExtensions({ b: 2 });
console.log(Object.isExtensible(frozen));
try {
  Object.defineProperty(frozen, "c", { value: 3 });
  console.log("define ok", frozen.c);
} catch (e) {
  console.log("define threw", e.constructor.name);
}
