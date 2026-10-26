# dependencies
```xl
```

# namespace cangjie

# class StatementLegacyMetrics

## static field LegacyStatementDispatchCount:int = 0

## static field ScanRootCallCount:int = 0

## static field RawTailBuildCount:int = 0

## static field ShapeAstDeclinedCount:int = 0

## static field DeclarationBracketWaitCount:int = 0

[D1] `VariableDeclarationEndPossibleShape` 在「初始化器里还是 raw 括号」那一格选择**继续等**的次数
（旧行为是按 C10 抛 `declaration 括号`）。它是「这一格改由收口格原子建树 / 下一格类型面接管」的计数器：
数字应当随宽尺子崩溃数一起下降，而不是无声地换一条错路。

## static field DeclarationInitializerAtomicCount:int = 0

[D1] `VariableDeclarationShape.FinishIncremental` 的**原子建树**降级分支被走到的次数（初始化器里含括号时）。
该分支用 legacy `ExpressionBuilder` 把整条 raw 初始化器建出，并检查 `builder.At === builder.Units.length`；
计数器证明 103 条崩溃不是被静默吞掉，而是**逐条进了这条可验证的建树路径**。

## static method Reset:()=>void

```ts
StatementLegacyMetrics.LegacyStatementDispatchCount = 0;
StatementLegacyMetrics.ScanRootCallCount = 0;
StatementLegacyMetrics.RawTailBuildCount = 0;
StatementLegacyMetrics.ShapeAstDeclinedCount = 0;
StatementLegacyMetrics.DeclarationBracketWaitCount = 0;
StatementLegacyMetrics.DeclarationInitializerAtomicCount = 0;
```
