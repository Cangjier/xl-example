// xl:note namespace N { ... } 基本形式：体里只放一条 export const 也要成形
// **合并**（第 784 轮）：token/declarations/decl-namespace-body-const.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
namespace N {
  export const a = 1
}
