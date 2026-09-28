# dependencies
```xl
import { IReleasable } from "./i-releasable.xl.md"
```

# namespace cangjie

资源持有者协议：把一组 `IReleasable` 登记到 `IOwner` 上，由它统一释放。

# interface IOwner

资源持有者。

## readonly field Releasables:Array<IReleasable>

已登记、尚未释放的资源。原 C# 侧是只读属性 `List<IReleasable> Releasables { get; }`。

## method Add:(items:Array<IReleasable>)=>IOwner

登记一批资源并返回自身，便于链式调用。

原 C# 签名是 `IOwner Add(params IReleasable[] items)`。xl 没有 `params` 关键字，可变参数按「数组参数」声明，由目标语言还原成自己的可变参数形式（ts 用剩余参数，C# 用 `params`）。
