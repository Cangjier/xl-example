// xl:note 按下标取出方法、调用、再取成员（`o["f"]().v`）
// xl:expect PropertyAccess,Bracket,ConstString,Let
// 第 692 轮收编的**形状**：这种写法在 token 层是**两格**——
// `<PropertyAccess>`（`o["f"]`）与第二个 `<PropertyAccess>`（`()` + `.v`）平级，
// 而投影层原来只投第一格 ⇒ `CallExpression` 与 `.v` **整片丢**
// （`console.log(o["f"]().v)` 打印**那个函数自己**，Node 打印 `1`——静默错值）。
// 现在链那一支认「第二格以一次调用开头」（`isCallFirstUnit`），摊开照链条折。
const v = o["f"]().v;
