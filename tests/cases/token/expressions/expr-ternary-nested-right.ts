// xl:note 右结合嵌套三元：`a ? b : c ? d : e` 要外层也成形
//（`Previous` 的第四层会让位给假值段里的内层 `?`，而 `Reorganize` 单趟时
//  外侧已经扫过去了、永远拿不到第二次机会——所以队列改成**固定两趟**）
// 条件类型不能被两趟带出来的第二遍误判成三元（`<`/`>` 那侧要按文本判 extends，见用例 type-cond-*）
// xl:expect TernaryOperator:6
const x = a ? b : c ? d : e;
const y = a ? b : c;
const z = a ? b : c ? d : e ? f : g;
