// xl:note 属性名恰好是关键字 `import`：这是成员名，不是导入声明
// 真缺口：`ImportReorganization.Previous` 只认「内容等于 import 的 Identifier」，
// 于是 `a.import` 里的 `import` 也被当成导入声明接手；
// `Process` 往后立刻撞上语句结尾，收集到的单元为空，取 `items[items.length - 1]`
// 拿到 `undefined`，抛的是 `TypeError`（不是 `SyntaxException`），整份文件解析失败。
// 判据与 `new.xl.md` 里 `a.new` 那一支同型：关键字不能只看自己，还要看它前面那一格。
// xl:expect Keyword:1
// xl:absent Import
const x = a.import
