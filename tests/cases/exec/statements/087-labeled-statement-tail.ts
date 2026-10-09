// xl:title 带标签的语句：标签后面那些语句不能被壳吞掉
// xl:round 692
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `exec/statements/r692-labeled-statement-tail`；正文一字未动）。
// 判定点只有一个：**带标签的语句是「标签 + 被标的那一格」，尾巴另收**——
// 标签后面的语句（含函数体里那个 `return`）必须照跑：`break outer` / `continue outer` /
// 裸块上的 `break lbl` / 连续两个标签 / 顶层带标签的 `while` 后面那条语句。
// （同域的 `079-labeled-statements` 量的是「标签贴在哪种语句上、break 跳出去从哪儿继续」，
//  全部发生在 IIFE 里；本条钉的是**壳有没有把尾巴吞掉**那一半。）
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
