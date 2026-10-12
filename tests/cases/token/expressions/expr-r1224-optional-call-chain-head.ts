// xl:note 第 1224 轮新立：`.名字?.(…)` 那条链的**头一格不是名字**时，接收者被留在 `Method` 外面
// （`new C().b?.(1)` 的产物原来是 `[New, Method(name="", [., b, NullConditionalOperator(…)])]`）。
// 根在 `OptionalCallCloseRule.CalleeStart`：它往左走时在 `New` / 模板串 / 正则 / 数组字面量
// 这些**能当链基名**的单元上停住了。补法不是再补一张类名表——`IsChainLink` 接上基类那一格
// `IsChainBaseNode`（由各页自己声明），缺的那一半就都在里面了。
// xl:end
declare const a: any, b: any, f: any, C: any;
const o = { p: 1 };
const arr = [1];
const s = "x";
const re = /x/;

new C().b?.(1);
new C()[0]?.(1);
new C().b?.[0];
new C().b?.c?.(1);
new C().b?.[0]?.(1);
new C().b?.(1)?.c;
new C().b?.().c;
a!`t`.b?.(1);
a!`t`[0]?.(1);
arr.map?.(f);
arr[0]?.(1);
s.b?.(1);
re.test?.(s);
o.p?.(1);
this.b?.(1);
