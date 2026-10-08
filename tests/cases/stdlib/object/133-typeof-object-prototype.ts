// xl:title `typeof Object.prototype` 是 `object`（`Function.prototype` 才是 `function`）
// xl:round 690
// xl:judge stdout
// xl:why 第 228 轮把**两个**原型对象一起认成 `"function"`，理由是
//       「JS 里 `typeof Object.prototype` 与 `typeof Function.prototype` 都是 `"function"`」
//       ——前半句是错的：`Object.prototype` 在 JS 里是**普通对象**（给 `"object"`），
//       `Function.prototype` 才是**可调用对象**（给 `"function"`）。
//       认错了的症状是 `typeof x === "function"` 这种守卫对 `Object.prototype` 判真。
// xl:end
console.log("Object.proto", typeof Object.prototype,
  "Function.proto", typeof Function.prototype,
  "Array.proto", typeof Array.prototype);
console.log("instanceof", Object.prototype instanceof Object, typeof Object.prototype.toString);
