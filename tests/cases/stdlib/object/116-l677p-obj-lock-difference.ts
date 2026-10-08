// xl:title 口径边界：preventExtensions + defineProperty 在 node（松散）静默、本仓抛（严格）
// xl:judge stdout
// xl:want differ
// xl:why 口径边界：`preventExtensions` 之后 `defineProperty` 本仓抛（严格模式的选择）、node 把 .ts 当 CJS 跑是松散模式所以静默——与 `freeze` 那一族同档，不算缺口
// xl:end

const frozen = Object.preventExtensions({ b: 2 });
console.log(Object.isExtensible(frozen));
try {
  Object.defineProperty(frozen, "c", { value: 3 });
  console.log("define ok", frozen.c);
} catch (e) {
  console.log("define threw", e.constructor.name);
}
