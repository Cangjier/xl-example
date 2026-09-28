# namespace cangjie

分支条件的返回值：是否成立，外加一个给分支自定义的消息号。

# class BranchConditionResult

分支条件的结果。

原 C# 侧是 `struct BranchConditionResult`（值类型，赋值即复制），另外定义了 `bool` 与 `int` 到它的两个**隐式转换运算符**。xl 既没有值类型也没有运算符重载：值语义由下面的 `Clone` 显式表达（M16），两个隐式转换由两个静态工厂替代（M19）。

## field Success:bool = false

条件是否成立。

## field Message:int = 0

分支自定义的消息号。约定：`0` 表示「新建一个单元」，`1` 表示「追加到上一个单元」——具体含义由各 `Branch.Condition` 与 `Branch.Success` 共同解释。

## static method FromBool:(success:bool)=>BranchConditionResult

`bool → BranchConditionResult` 隐式转换的替代；`Message` 保持 `0`。

```ts
const result = new BranchConditionResult();
result.Success = success;
return result;
```

## static method FromInt:(message:int)=>BranchConditionResult

`int → BranchConditionResult` 隐式转换的替代；`Success` 恒为 `true`。

```ts
const result = new BranchConditionResult();
result.Success = true;
result.Message = message;
return result;
```

## method Clone:()=>BranchConditionResult

值语义复制的显式入口。

```ts
const copy = new BranchConditionResult();
copy.Success = this.Success;
copy.Message = this.Message;
return copy;
```
