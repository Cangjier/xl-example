// xl:note 第 1210 轮（口径 1.1）收掉：两个下标连着、外面再套断言 a?.[c][c]!——
// 核是 PropertyAccess([Bracket, Bracket])，两格下标原来都被跳过 ⇒ 整条链只剩一个 Identifier。
// xl:round 1210
// xl:end
a?.[c][c]!;
