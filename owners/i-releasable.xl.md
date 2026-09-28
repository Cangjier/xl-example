# namespace cangjie

Cangjie 执行器的资源归属层：谁持有资源、谁负责释放。

本目录（`owners/`）对应原 C# 项目的 `Owners/`。规范里所有文件共用同一个 `# namespace cangjie`（xl 的 `# namespace` 只接受单个标识符），C# 的 `Cangjie.Owners` / `Cangjie.Core.Runtime` 这类子命名空间改由目录层级表达。

# interface IReleasable

可释放资源。

## method Release:()=>void

释放对象持有的资源。

约定：可重复调用，第二次及其后是空操作；调用后对象不再可用。
