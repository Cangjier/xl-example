// xl:note 抽象方法的形参表与名字之间换行（第 907 轮片段普查量出）：TS 那边是 `MethodDeclaration`，产物把 `abstract override m` 落成 `PropertyDeclaration`、`():void;` 落成一条无名 `CallSignature`
// xl:round 907
// xl:known-gap 与第 902 / 904 轮那两格同族（`abstract m` 换行 `<T>(): void;`）：解析期在换行处收壳，收尾期的 `MethodDeclarationCloseRule` 拿到的是「一个名字 + 一个括号」两格
// xl:end
abstract class B extends A { abstract override m
():void; }
