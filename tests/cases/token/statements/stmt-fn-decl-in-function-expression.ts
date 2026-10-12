// xl:note 匿名函数表达式体里的函数声明：体里的声明**不是**表达式
//       （第 134 轮：`expressionPosition` 是「这一个节点」的标记，用完要还回去。
//        产物这边两个都是 `<Function>`——**kind 的差别由 `cases:tsast` 判**
//        （它是「与 `ts.createSourceFile` 逐节点一致」那把尺子），这里只钉产物的标签。）
// xl:expect Function:2
(function () {
  function helper() { return 1; }
  return helper();
})();
