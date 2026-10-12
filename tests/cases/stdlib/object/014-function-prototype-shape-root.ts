// xl:title `Function.prototype` 是一个真落点：`call` / `apply` / `bind` 都在它上面
// xl:judge stdout
// xl:end

function add(a: number, b: number) { return a + b; }
console.log(typeof Function, typeof Function.prototype, typeof Function.prototype.call);
console.log(Function.prototype.call === Function.prototype.call);
// **绑定结果要先落到一个名字上** ✓：`add.bind(null, 5)(6)`（**调用一个调用结果**）
// 是**记在台账里的已知缺口** ✗（投影层那一族 ✓），与本条要量的东西无关 ✓。
const bound = add.bind(null, 5);
console.log(add.call(null, 1, 2), add.apply(null, [3, 4]), bound(6));
console.log(bound.call(null, 100), typeof bound.bind);
console.log(Object.prototype.toString.call([]), Object.prototype.toString.call(1));
