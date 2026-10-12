// xl:note 嵌套 try：内层 try 必须自己成形，不能被折进外层语句
// xl:expect Try,TryBody,CatchBody,FinallyBody,Statement
try {
  try {
    f()
  } catch (e) {
    g(e)
  }
} finally {
  h()
}
