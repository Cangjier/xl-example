// xl:note catch 里重新抛出异常
// xl:expect Try,TryBody,CatchBody,Statement
try {
  f()
} catch (e) {
  throw e
}
