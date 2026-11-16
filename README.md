# session-id-header

DeepSeek Harness 会话 ID 透传插件。

通过 Harness 的 `llm-pi-ai/request-headers` 扩展，把现有会话 ID 动态加入自定义模型 API 的 HTTP 请求头。

本仓库仅包含插件源文件和配置示例，没有自动安装程序、自动执行脚本或 API 密钥。解压不会修改 Harness 配置，是否启用由使用者手动决定。

## 行为

- 同一会话的多次请求使用相同的会话 ID。
- 不同会话使用各自的会话 ID。
- 没有 `sessionId` 的辅助调用不添加请求头。
- 仅处理 `config.providers` 指定的 provider 路由，默认示例为 `linksub`。
- 默认请求头为 `x-session-id`，可通过 `config.headers` 修改。
- 插件不新建会话，不修改消息正文，也不保存或上传日志。

请求头示例：

```http
x-session-id: session-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 手动启用

1. 将 `session-id-header.mjs` 放在电脑上的固定位置，后续保留该文件。
2. 打开本仓库的 `cordis.patch.example.yml`，将 `name` 改成该文件在自己电脑上的绝对 `file:` URL。以下只是格式示例，需要换成实际路径：

   macOS：`file:///Users/yourname/harness-plugins/session-id-header.mjs`

   Windows：`file:///C:/Users/yourname/harness-plugins/session-id-header.mjs`

   Linux：`file:///home/yourname/harness-plugins/session-id-header.mjs`

   Windows 的 URL 使用正斜线 `/`。不要把 `~` 当作完整路径；路径中有空格时使用 `%20`。

3. 将 `providers: [linksub]` 改成自己配置中实际的 provider 路由名。这里填的是 `providers` 字典的键，不是模型名称。例如路由叫 `my-gateway`，则填写 `providers: [my-gateway]`。需要多个路由时可填写 `providers: [my-gateway, another-gateway]`。
4. 按中转站实际接收的字段设置 `headers`。例如读取 `x-session-id` 时保持默认；读取其他头名时将该项替换。也可填写多个头名，它们会使用相同的会话 ID。
5. 先手动备份现有的 `cordis.patch.yml`，再把修改后的示例条目追加到对应 profile 的补丁数组中。不要覆盖原配置，也不要新增第二个同 ID 条目。默认 desktop profile 的路径通常是：

   macOS / Linux：`~/.dsh/profiles/desktop/cordis.patch.yml`

   Windows：`%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`

   如果使用了其他 profile 或自定义数据目录，以实际配置位置为准。

6. 保存配置，重启 DeepSeek Harness。

## 检查效果

从中转站收到的 HTTP 请求检查指定的请求头。同一会话发送两次消息应看到相同 ID；新建另一会话后应看到不同 ID。

只有中转站读取了这个头，后台才能据此关联请求。如果还需要继续传给上游，中转站也必须支持对应透传。插件不修改中转站配置。

## 撤销

从补丁数组中移除本插件的 `id: session-id-header` 插入条目，然后重启 Harness。插件文件可在不再被引用后自行删除。

## 已验证范围

2026-11-16，在桌面版 `0.2.2-rc.3` 自带的 Cordis 和 PiAiAdapter 上，以 `openai-completions` 协议连接本地 SSE 模拟接口验证：

- 两个独立的测试 sessionId，各调用两次，共四次，均发送正确的 `x-session-id` 并正常接收回复。
- 无 sessionId 时不添加该头。
- provider 不在允许列表中时不添加该头。

未验证所有操作系统、所有 Harness 版本或所有中转服务。本仓库通过接口扩展工作，其他版本需要保留同名事件以及 `request.sessionId` 参数。以上测试没有调用真实中转模型。

## 分享

可以分享本仓库链接，或下载源码压缩包后发给其他人。每个人都需要按自己的插件路径、provider 路由名和中转站请求头要求手动修改示例。包内没有任何人的本地配置、聊天记录、真实会话 ID 或密钥。
