// xl:expect Let,String,ConstString
// xl:absent InterpolationString
// xl:note 模板字面量（无内插）：整段是一个 String + ConstString——**没有** `InterpolationString`。
// 这条用例原来的期望写的是 `InterpolationString`，那是模板串还没接进来时的猜测；
// 「无内插的模板」在结构上就是普通字符串，这正是 TypeScript 的语义（模板也是 String）
const a = `abc`;
