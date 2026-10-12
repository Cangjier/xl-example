// xl:note 第 1210 轮（口径 1.1）收掉：两层非空断言 a?.b!!——外层那一格的核是**内层那一整格
// NotNull**，原来落到通用支去读 NameNode（把「名字 + !」当成一个名字）；
// assertedMember 新增一格「核又是 NotNull」，递回自己折内层、外面再套一层 NonNullExpression。
// xl:round 1210
// xl:end
a?.b!!;
