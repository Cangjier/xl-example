// xl:note 表达式文法：展开运算符没有节点。`f(...args)` / `[...xs]` / `{ ...obj }` 现在
// `...` 只是散着的 `Symbol`，AST 侧是 SpreadElement / SpreadAssignment（语料里实测 32 处）
// xl:expect Spread
// xl:absent TypeDefine
call(...args);
const merged = { ...base, extra: 1 };
const copied = [...items];
