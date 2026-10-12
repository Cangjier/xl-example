// xl:note 标签链中间换行（第 929 轮）：`a:` 换行 `b:` 换行 `for (…)` 在 TS 里是**一条嵌套的**
// `LabeledStatement`，而解析期的续接判据（`LabelCloseRule.IsPendingLabelHead`）只问**末尾**
// 那个名字是不是语句开头——链里第二个名字前面是 `a :` ⇒ 判否 ⇒ 换行处按 ASI 收壳。
// **第 929 轮（三）收掉**：那一问顺着标签链往左走（链上任意一个名字在语句开头，整串就是标签头）。
// 三档都在这里当守卫：两格链、三格链、以及链尾直接落一条表达式语句。
// xl:expect Label:8,For,ForBody,Method
a: b:
for (;;) { break a; }
c: d:
e: f();
g: h: i: j();
