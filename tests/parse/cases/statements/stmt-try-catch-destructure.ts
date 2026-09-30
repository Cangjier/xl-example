// xl:note catch 的绑定是解构模式
// xl:expect Try,TryBody,CatchBody,CatchDefine
try {
  f()
} catch ({ message }) {
  g(message)
}
