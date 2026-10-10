// xl:note `f<A, B>`t``：与 `gap-r977-inst-tagged` 同一条根（投影没把实例化表达式与模板串合成
//        `TaggedTemplateExpression`）。这一条量的是**两个类型实参**那一档——TS 的
//        `ExpressionWithTypeArguments` 里是两个 `TypeReference`，产物那边只投出一格。
//        第 977 轮普查里 `inst-tagged` 那一个底样的**每个位置 × 三种 trivia 共 39 条**全部对不上，
//        另加 `f<g<T>>`t``（嵌套实参）与 `f<T>`${1}``（带插值的模板）两条同族。
// xl:round 977
// xl:known-gap 两个类型实参的实例化表达式与模板串没合成 `TaggedTemplateExpression`（内层 TypeReference 也丢）
// xl:end
const a = f<A, B>`t`;
