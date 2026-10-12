// 语料 09：**没接住的抛出**——退出码是这条判据的一半。
//
// 这一份故意在顶层抛：两边都该把日志先打完（stdout 逐字节相同），
// 再把「脚本抛出」写进 **stderr**（形态不作承诺：`node` 打的是 V8 的栈帧，
// 本运行器没有帧可打），并且**退出码都是 1**。
// stdout 与退出码是这一份真正钉住的东西。

console.log("before-throw", 1 + 1);
console.log("about-to-throw");

throw { message: "intentional", code: 42 };
