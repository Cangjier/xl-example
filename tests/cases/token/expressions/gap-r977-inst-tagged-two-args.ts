// xl:note 第 979 轮收掉：与 `gap-r977-inst-tagged` 同一条根、同一处修法（`projectExpression` 的
//        0a 里那一档）。这一条量的是**两个类型实参**那一档——TS 的 `TaggedTemplateExpression`
//        自己带 `typeArguments`（两个 `TypeReference`），原来那个 `ExpressionWithTypeArguments`
//        把两个实参都吞进去了、模板整格不见（缺 2 多 1）。
// xl:round 977
// 原来登记的那一句：`f<A, B>`t``：与 `gap-r977-inst-tagged` 同一条根（投影没把实例化表达式与模板串
//        合成 `TaggedTemplateExpression`）。第 977 轮普查里 `inst-tagged` 那一个底样的**每个位置 ×
//        三种 trivia 共 39 条**全部对不上，另加 `f<g<T>>`t``（嵌套实参）与 `f<T>`${1}``（带插值的模板）。
// xl:end
const a = f<A, B>`t`;
