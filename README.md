# 小码快改

小码快改是一个面向 HTML 课件和网页文件的轻量编辑工具。

Slogan：网页快改，就找小码

## 第一版能力

- 上传本地 `.html` / `.htm` 文件
- 在浏览器本地解析与编辑，不默认上传用户文件
- 支持文字、图片、表格、模块样式编辑
- 支持飞象课件 HTML 结构识别与分页编辑
- 支持预览、源码查看、一键导出
- 支持基础撤销、缩放和删除二次确认

## 本地开发

```bash
npm install
npm run dev
```

## 构建发布

```bash
npm run build
npm run preview
```

构建产物会输出到 `dist/`，可以部署到 Vercel、Netlify 或 Cloudflare Pages。

## 推荐部署方式

第一版推荐使用 Vercel：

1. 把本项目上传到 GitHub。
2. 在 Vercel 中选择该 GitHub 仓库。
3. Framework Preset 选择 `Vite`。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。
6. 部署完成后绑定正式域名。

## 隐私说明

第一版默认在浏览器本地处理 HTML 文件，上传文件不会自动发送到服务器。
