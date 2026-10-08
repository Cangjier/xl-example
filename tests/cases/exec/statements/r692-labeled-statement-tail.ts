// xl:title 带标签的语句：标签后面那些语句不能被壳吞掉
// xl:round 692
// xl:judge stdout
// xl:end
// **第 692 轮修的那一格**：token 层把 `outer: for (…) { … }` 与**它后面那条语句**
// 收进了**同一个** `Statement` 壳（`SplitShell` 遇到 `Label` 开头时一律让开），
// 而投影的标签那一支只吃「标签 + 被标的语句」⇒ **壳里剩下的整段丢掉**：
// 顶层是「循环后面的语句一句都不跑」，函数体里更响——`return` 也在壳里，
// 于是**函数返回 `undefined`**（静默错值）。
// 修法：头是「一串连续标签 + 被它们标的那一格」（语句级单元，或者裸块），尾巴另收一条壳。
function loopTail() {
  let out = "";
  outer: for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      if (j === 1) break outer;
      out += i + "" + j;
    }
  }
  return out + "!";
}
console.log(loopTail());

function continueLabel() {
  let out = "";
  outer: for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (j === 1) continue outer;
      out += i + "" + j;
    }
  }
  return out;
}
console.log(continueLabel());

function blockLabel() {
  let out = "";
  lbl: {
    out += "a";
    break lbl;
    out += "b";
  }
  return out + "!";
}
console.log(blockLabel());

function doubleLabel() {
  let n = 0;
  first: second: for (let i = 0; i < 3; i++) {
    n = n + 1;
    if (i === 1) break first;
  }
  return n;
}
console.log(doubleLabel());

let top = "";
outer: while (true) {
  top += "w";
  break outer;
}
console.log(top + "!");
