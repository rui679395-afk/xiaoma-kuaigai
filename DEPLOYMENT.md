# 小码快改上线发布说明

## 当前项目状态

这是“小码快改”的第一版正式前端工程，基于 Vite 构建。

当前版本仍然保持轻量路线：不需要后端、不需要数据库、不需要用户登录，用户上传的 HTML 文件默认只在浏览器本地处理。

## 本地运行

```bash
npm install
npm run dev
```

运行后打开终端提示的网址即可。

## 生产构建

```bash
npm run build
```

构建成功后会生成 `dist/` 目录，这个目录就是可以发布到线上环境的静态网站文件。

## 本地预览生产版本

```bash
npm run preview
```

这个命令用于在本地预览 `dist/` 构建产物，效果更接近线上环境。

## 推荐发布到 Vercel

适合你当前阶段的最简单发布方式是 Vercel。

操作步骤：

1. 注册并登录 GitHub。
2. 新建一个仓库，例如 `xiaoma-kuaigai`。
3. 把本项目上传到 GitHub 仓库。
4. 注册并登录 Vercel。
5. 在 Vercel 里选择 `Add New Project`。
6. 选择刚才的 GitHub 仓库。
7. Framework Preset 选择 `Vite`。
8. Build Command 填 `npm run build`。
9. Output Directory 填 `dist`。
10. 点击 Deploy。

部署完成后，Vercel 会给你一个可访问的网址。

## 绑定正式域名

如果后续要推广，建议购买一个好记的域名，然后绑定到 Vercel。

域名方向可以参考：

- `xiaomakuaigai.com`
- `xiaomaedit.com`
- `kuaigaiye.com`

绑定域名后，Vercel 会自动配置 HTTPS。

## 后续建议

上线第一版后，建议优先补充这几类能力：

- 接入访问统计，记录访问量、上传次数、导出次数。
- 接入错误监控，定位真实用户上传文件时的异常。
- 收集 10-20 个真实飞象 HTML 文件作为固定测试样本。
- 增加用户反馈入口，例如“遇到问题请联系我”。
- 根据真实用户反馈决定是否做云端保存、登录、模板管理等能力。

## 隐私提示

当前版本默认在浏览器本地处理 HTML 文件，不会主动把用户上传的 HTML 文件发送到服务器。

如果后续增加云端保存、账号体系或文件同步，需要重新补充隐私政策和数据存储说明。
