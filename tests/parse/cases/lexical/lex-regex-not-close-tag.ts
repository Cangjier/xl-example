// xl:note JSX 闭合标签 `</div>` 不再被当成正则开头吞掉余下代码
//（正则字面量不可能跨行；`</div>` 的 `/` 前面是 `<`、被当成正则开头，
//  而后面没有第二个 `/`，`RegexToken` 一路吃到底——
//  实测 `const d = <div>x</div>;` 换行 `const after = 1;` 换行 `const after2 = 2;`
//  的产物只到 `<RegexToken>` 就结束，**后面的语句整段消失**。
//  判据加「本行内必须能找到配对的 `/`」之后，闭合标签退化成普通符号，余下代码保住）
// 这段在 `.ts` 里本身不是合法 TS（JSX 要 `.tsx`），但**正是它**暴露了那个吞代码的 bug
// xl:ts-invalid
// xl:expect Let:3
const d = <div>x</div>;
const after = 1;
const after2 = 2;
