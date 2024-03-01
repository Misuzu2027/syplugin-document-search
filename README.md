# 基于文档搜索


* 当前不足（后期计划）
  * 查询存在竞态条件
    * 前一次查询较慢（数据量大或网络问题）还未响应，后一次查询已经显示，此时前一次接口响应会覆盖后一次的显示。
  * 支持点击切换匹配结果
* 一些默认配置
  * 默认查询的块类型：
    * 文档, 标题, 代码块, 数学公式块, 表格块, 段落块, html块, 数据库
  * 默认会匹配块的命名、别名、备注
  * 默认排序方式：
    * 文档排序：相关度降序
    * 内容块排序：类型
  * 每页文档数量：10
  * 默认最大展开数量：100

# 更新日志

* 0.6.3
  * 添加 刷新预览区延迟 设置，可用于代码块、数据库等需要时间渲染的块内容高亮。
* 0.6.2
  * 被折叠的块可以正常预览并打开定位。
  * 修改标签内的id，与官方进行区别，防止重复id的错误调用。
  * 添加双击时间阈值设置。
* 0.6.1
  * 支持分别设置文档、内容块的排序方式
* 0.6.0
  * 支持预览区高亮，支持表格定位首个匹配关键字位置
* 0.5.2
  * 优化设置“显示文档块”的逻辑，优化上下键选择搜索结果的样式。
* 0.5.1
  * 修复搜索预览超出页面，优化搜索页的结构。
* 0.5.0
  * 支持设置过滤块类型、笔记本、快属性（命名、别名等）；支持配置每页文档数量、默认展开数量
* 0.4.0
  * 支持查询块的命名、别名、备注并显示
* 0.3.0
  * 支持分页查询
* 0.2.0
  * 支持手机端
* 0.1.0
  * 支持Dock和自定义页签查询