// xl:note 标签**包住**它标的那条语句（第 929 轮）：产物形如
// `<Label label="outer"><While>…</While></Label>`——与 TS 的 `LabeledStatement` 同形。
// 四条各钉一种排版：嵌套标签 / 块 / 平铺的表达式语句（标签与被标语句同在一个语句壳里）/
// 标签后面还跟着另一条语句（尾巴不许被吞进标签里）。`cases:tags` 另有一条结构不变式：
// 产物里**不许**再出现自闭合的 `<Label … />`。
// xl:expect Label,While,Bracket,Method,Let,Statement
a: b: while (x) { break a; }
blk: { let y = 1; }
done: f();
outer: while (x) { break outer; } g();
