// 小码快改核心编辑器逻辑
// 说明：当前版本从已验证的单文件 Demo 迁移而来，后续可继续拆分为上传、飞象适配、导出等独立模块。

const $ = (selector) => document.querySelector(selector);
    const editorFrame = $("#editorFrame");
    const previewFrame = $("#previewFrame");
    const propertyPanel = $("#propertyPanel");
    const fileInput = $("#fileInput");
    const codeDrawer = $("#codeDrawer");

    let selectedElement = null;
    let selectedCell = null;
    let currentFileName = "示例页面.html";
    let undoStack = [];
    let redoStack = [];
    let undoOverflow = false;
    let savedTextRange = null;
    let selectedTableMode = "cell";
    let metrics = { upload: 0, edit: 0, export: 0 };
    let currentSource = { type: "normal" };
    let editorZoom = 1;

    const sampleHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>示例落地页</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; color: #172033; background: #ffffff; }
    .hero { padding: 72px 9vw; background: linear-gradient(135deg, #eef4ff, #f6fffb); display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center; }
    .eyebrow { color: #2f6df6; font-weight: 800; letter-spacing: .08em; font-size: 13px; }
    h1 { font-size: clamp(36px, 6vw, 68px); line-height: 1.02; margin: 14px 0 20px; letter-spacing: -0.06em; }
    p { font-size: 17px; line-height: 1.75; color: #566074; }
    .button { display: inline-block; margin-top: 20px; background: #2f6df6; color: #fff; text-decoration: none; padding: 13px 20px; border-radius: 14px; font-weight: 800; }
    .mock { border-radius: 28px; min-height: 360px; background: #172033; color: #fff; padding: 24px; box-shadow: 0 30px 70px rgba(23,32,51,.22); }
    .mock img { width: 100%; height: 220px; object-fit: cover; border-radius: 18px; background: #2f6df6; }
    section { padding: 58px 9vw; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .card { border: 1px solid #dfe4ee; border-radius: 22px; padding: 22px; background: #fff; }
    .card h3 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    th, td { border: 1px solid #dfe4ee; padding: 12px; text-align: left; }
    th { background: #f6f7fb; }
    @media (max-width: 760px) { .hero, .cards { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <div class="eyebrow">HTML EDITOR MVP</div>
        <h1>上传、编辑、导出，一个浏览器里完成。</h1>
        <p>这是一个用于演示的 HTML 页面。你可以直接点击这段文字修改内容，也可以选中右侧图片并替换成本地图片。</p>
        <a class="button" href="https://example.com">开始体验</a>
      </div>
      <div class="mock">
        <img alt="示例图片" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='520' viewBox='0 0 900 520'%3E%3Crect width='900' height='520' fill='%232f6df6'/%3E%3Ccircle cx='680' cy='140' r='95' fill='%2311a683' opacity='.85'/%3E%3Cpath d='M80 410 C230 210 350 450 500 260 S720 240 820 360' stroke='white' stroke-width='26' fill='none' stroke-linecap='round' opacity='.78'/%3E%3Ctext x='80' y='120' fill='white' font-family='Arial' font-size='54' font-weight='700'%3EEditable Image%3C/text%3E%3C/svg%3E">
        <p style="color:#cbd5e1">图片、文字、表格都可以作为第一版核心编辑对象。</p>
      </div>
    </section>
    <section>
      <h2>核心能力</h2>
      <div class="cards">
        <article class="card"><h3>文本编辑</h3><p>点击文本即可直接改写，右侧面板可以改颜色、字号和对齐方式。</p></article>
        <article class="card"><h3>图片编辑</h3><p>选中图片后可以上传本地图片替换，导出时会保留在 HTML 文件内。</p></article>
        <article class="card"><h3>表格编辑</h3><p>表格支持基础单元格编辑、增删行列，覆盖第一版常见需求。</p></article>
      </div>
    </section>
    <section>
      <h2>示例表格</h2>
      <p>点击下面表格中的任意单元格，再使用右侧属性面板操作。</p>
      <table>
        <thead>
          <tr><th>功能</th><th>第一版范围</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr><td>上传 HTML</td><td>本地读取文件</td><td>已覆盖</td></tr>
          <tr><td>图片替换</td><td>本地图片转内嵌资源</td><td>已覆盖</td></tr>
          <tr><td>导出 HTML</td><td>浏览器直接下载</td><td>已覆盖</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;

    function toast(message) {
      const el = $("#toast");
      el.textContent = message;
      el.classList.add("show");
      window.clearTimeout(toast.timer);
      toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
    }

    function customConfirm(title, message) {
      return new Promise((resolve) => {
        const modal = $("#confirmModal");
        $("#confirmTitle").textContent = title;
        $("#confirmMessage").textContent = message;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");

        function cleanup() {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
          $("#confirmOkBtn").removeEventListener("click", onOk);
          $("#confirmCancelBtn").removeEventListener("click", onCancel);
        }
        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }

        $("#confirmOkBtn").addEventListener("click", onOk);
        $("#confirmCancelBtn").addEventListener("click", onCancel);
      });
    }

    function trackEvent(name, detail = {}) {
      const event = {
        name,
        detail,
        fileType: currentSource.type,
        fileName: currentFileName,
        time: new Date().toISOString()
      };
      const list = JSON.parse(localStorage.getItem("xiaoma_kuaigai_events") || "[]");
      list.push(event);
      localStorage.setItem("xiaoma_kuaigai_events", JSON.stringify(list.slice(-200)));
      window.dispatchEvent(new CustomEvent("xiaoma:kuaigai:event", { detail: event }));
      console.info("[小码快改埋点]", event);
    }

    function updateMetrics(type) {
      if (type) {
        metrics[type] += 1;
        trackEvent(type, { count: metrics[type] });
      }
      const uploadEl = $("#metricUpload");
      const editEl = $("#metricEdit");
      const exportEl = $("#metricExport");
      if (uploadEl) uploadEl.textContent = `${metrics.upload} 次`;
      if (editEl) editEl.textContent = `${metrics.edit} 次`;
      if (exportEl) exportEl.textContent = `${metrics.export} 次`;
    }

    function setDocState(message) {
      $("#docName").textContent = currentFileName;
      $("#docState").textContent = message;
    }

    function getEditorDocument() {
      return editorFrame.contentDocument || editorFrame.contentWindow.document;
    }

    function getFullHtml() {
      const doc = getEditorDocument();
      if (!doc || !doc.documentElement) return "";
      clearSelectionOutline();
      const exportDoc = new DOMParser().parseFromString("<!DOCTYPE html>\n" + doc.documentElement.outerHTML, "text/html");
      cleanEditorArtifacts(exportDoc);
      const editHtml = "<!DOCTYPE html>\n" + exportDoc.documentElement.outerHTML;
      if (currentSource.type === "feixiang-deck") {
        return rebuildFeixiangDeckHtml(exportDoc);
      }
      if (currentSource.type === "iframe-srcdoc") {
        return embedSrcdocIntoOuterHtml(editHtml);
      }
      return editHtml;
    }

    function getEditingHtmlForHistory() {
      return captureEditorHtml();
    }

    function captureEditorHtml() {
      const doc = getEditorDocument();
      if (!doc || !doc.documentElement) return "";
      const cloneDoc = new DOMParser().parseFromString("<!DOCTYPE html>\n" + doc.documentElement.outerHTML, "text/html");
      cleanEditorArtifacts(cloneDoc);
      return "<!DOCTYPE html>\n" + cloneDoc.documentElement.outerHTML;
    }

    function cleanEditorArtifacts(doc) {
      doc.querySelectorAll("style[data-editor-helper]").forEach((el) => el.remove());
      doc.querySelectorAll(".editor-resize-handle").forEach((el) => el.remove());
      doc.querySelectorAll(".editor-drag-handle").forEach((el) => el.remove());
      doc.querySelectorAll("[data-editor-selected]").forEach((el) => el.removeAttribute("data-editor-selected"));
      doc.querySelectorAll("[data-editor-table-row], [data-editor-table-col]").forEach((el) => {
        el.removeAttribute("data-editor-table-row");
        el.removeAttribute("data-editor-table-col");
      });
    }

    function getEditorScroll() {
      const win = editorFrame.contentWindow;
      const doc = getEditorDocument();
      return {
        x: win ? win.scrollX : 0,
        y: win ? win.scrollY : 0,
        bodyTop: doc && doc.scrollingElement ? doc.scrollingElement.scrollTop : 0,
        bodyLeft: doc && doc.scrollingElement ? doc.scrollingElement.scrollLeft : 0
      };
    }

    function restoreEditorScroll(scroll) {
      if (!scroll) return;
      const win = editorFrame.contentWindow;
      const doc = getEditorDocument();
      requestAnimationFrame(() => {
        if (doc && doc.scrollingElement) {
          doc.scrollingElement.scrollTop = scroll.bodyTop || scroll.y || 0;
          doc.scrollingElement.scrollLeft = scroll.bodyLeft || scroll.x || 0;
        }
        if (win) win.scrollTo(scroll.x || scroll.bodyLeft || 0, scroll.y || scroll.bodyTop || 0);
        editorFrame.style.visibility = "";
      });
    }

    function pushHistory() {
      const html = getEditingHtmlForHistory();
      if (!html) return;
      if (undoStack[undoStack.length - 1] === html) return;
      undoStack.push(html);
      if (undoStack.length > 5) {
        undoStack.shift();
        undoOverflow = true;
      }
      redoStack = [];
    }

    function loadHtml(html, fileName = "未命名.html", stateMessage = "已载入，可以在画布中直接编辑，或点击元素使用右侧属性面板") {
      restoreHtmlSnapshot(html, {
        fileName,
        stateMessage,
        resetHistory: true
      });
    }

    function restoreHtmlInPlace(html, options = {}) {
      const doc = getEditorDocument();
      if (!doc || !doc.documentElement) return false;
      const parsed = new DOMParser().parseFromString(html, "text/html");
      if (!parsed || !parsed.documentElement) return false;
      selectedElement = null;
      selectedCell = null;
      currentFileName = options.fileName || currentFileName || "未命名.html";
      codeDrawer.classList.remove("open");
      doc.documentElement.innerHTML = parsed.documentElement.innerHTML;
      doc.designMode = "on";
      doc.body.setAttribute("data-html-editor-demo", "true");
      injectEditorHelpers(doc);
      renderEmptyPanel();
      if (currentSource.type === "feixiang-deck") {
        setEditorZoom("fit", false);
      } else {
        setEditorZoom(editorZoom, false);
      }
      setDocState(options.stateMessage || "已载入，可以在画布中直接编辑，或点击元素使用右侧属性面板");
      restoreEditorScroll(options.scroll);
      return true;
    }

    function restoreHtmlSnapshot(html, options = {}) {
      if (options.inPlace && restoreHtmlInPlace(html, options)) return;
      selectedElement = null;
      selectedCell = null;
      currentFileName = options.fileName || currentFileName || "未命名.html";
      codeDrawer.classList.remove("open");
      editorFrame.srcdoc = html;
      editorFrame.onload = () => {
        const doc = getEditorDocument();
        doc.designMode = "on";
        doc.body.setAttribute("data-html-editor-demo", "true");
        injectEditorHelpers(doc);
        bindCanvasEvents(doc);
        if (options.resetHistory) {
          undoStack = [];
          redoStack = [];
          undoOverflow = false;
        }
        renderEmptyPanel();
        if (currentSource.type === "feixiang-deck") {
          setEditorZoom("fit", false);
        } else {
          setEditorZoom(editorZoom, false);
        }
        setDocState(options.stateMessage || "已载入，可以在画布中直接编辑，或点击元素使用右侧属性面板");
        if (options.scroll) {
          restoreEditorScroll(options.scroll);
        } else {
          editorFrame.style.visibility = "";
        }
      };
    }

    function resetSource() {
      currentSource = { type: "normal" };
    }

    function prepareHtmlForEditing(rawHtml) {
      const iframeInfo = extractSrcdocIframe(rawHtml);
      if (!iframeInfo) {
        currentSource = { type: "normal" };
        return {
          editHtml: rawHtml,
          message: "普通 HTML 模式：可直接点击页面元素编辑"
        };
      }

      const deckInfo = extractFeixiangDeck(iframeInfo.srcdoc);
      if (deckInfo) {
        currentSource = {
          type: "feixiang-deck",
          outerHtml: rawHtml,
          innerHtml: iframeInfo.srcdoc,
          iframeSelector: iframeInfo.selector,
          pageCount: deckInfo.pages.length
        };
        return {
          editHtml: buildFeixiangDeckEditorHtml(deckInfo),
          message: `已识别为飞象课件格式：共 ${deckInfo.pages.length} 页，已切换为课件编辑模式`
        };
      }

      currentSource = {
        type: "iframe-srcdoc",
        outerHtml: rawHtml,
        innerHtml: iframeInfo.srcdoc,
        iframeSelector: iframeInfo.selector
      };
      return {
        editHtml: iframeInfo.srcdoc,
        message: "已识别内嵌 iframe 内容：正在编辑内层 HTML，导出时会回写到原文件结构"
      };
    }

    function extractSrcdocIframe(rawHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, "text/html");
      const iframe = doc.querySelector("iframe[srcdoc]");
      if (!iframe) return null;
      return {
        srcdoc: iframe.getAttribute("srcdoc") || "",
        selector: iframe.className ? `iframe.${String(iframe.className).trim().split(/\s+/).join(".")}` : "iframe[srcdoc]"
      };
    }

    function extractFeixiangDeck(innerHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(innerHtml, "text/html");
      const pageTemplates = Array.from(doc.querySelectorAll("template.page-data"));
      if (!pageTemplates.length) return null;
      const sharedTemplate = doc.querySelector("template.page-shared");
      return {
        sharedHtml: sharedTemplate ? sharedTemplate.innerHTML : "",
        title: doc.querySelector("title") ? doc.querySelector("title").textContent : "飞象课件",
        pages: pageTemplates.map((template, index) => ({
          id: template.getAttribute("data-id") || String(index + 1),
          name: template.getAttribute("data-name") || `第 ${index + 1} 页`,
          html: template.innerHTML
        }))
      };
    }

    function buildFeixiangDeckEditorHtml(deckInfo) {
      const pagesHtml = deckInfo.pages.map((page, index) => `
        <div class="deck-page-shell" data-page-shell="${index}">
          <section class="deck-edit-page" data-page-index="${index}" data-page-id="${escapeHtml(page.id)}" data-page-name="${escapeHtml(page.name)}">
            <div class="deck-page-bar">
              <span>第 ${index + 1} 页</span>
              <strong>${escapeHtml(page.name)}</strong>
            </div>
            <div class="deck-slide-surface">
              ${protectPageScripts(page.html)}
            </div>
          </section>
        </div>
      `).join("");

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(deckInfo.title)} - 编辑模式</title>
  ${deckInfo.sharedHtml}
  <style>
    html, body {
      margin: 0 !important;
      min-height: 100% !important;
      height: auto !important;
      overflow: auto !important;
      background: #eef2f7 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif !important;
    }
    body {
      padding: 28px !important;
    }
    .deck-page-shell {
      width: calc(1280px * var(--deck-zoom, 1));
      height: calc(720px * var(--deck-zoom, 1));
      margin: 0 auto 34px;
      position: relative;
      overflow: visible;
    }
    .deck-edit-page {
      width: 1280px;
      height: 720px;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 20px 54px rgba(15, 23, 42, .16);
      position: absolute;
      left: 0;
      top: 0;
      overflow: hidden;
      border: 1px solid #dfe4ee;
      transform: scale(var(--deck-zoom, 1));
      transform-origin: top left;
    }
    .deck-page-bar {
      position: absolute;
      left: 18px;
      top: 14px;
      z-index: 999;
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(15, 23, 42, .74);
      color: #fff;
      font-size: 12px;
      backdrop-filter: blur(8px);
      pointer-events: none;
    }
    .deck-page-bar span {
      color: #bfdbfe;
      font-weight: 700;
    }
    .deck-page-bar strong {
      font-weight: 700;
    }
    .deck-slide-surface {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: #fff;
    }
    .deck-slide-surface > * {
      min-height: 100% !important;
      width: 100% !important;
    }
    .deck-slide-surface img {
      user-select: none;
    }
    [data-editor-selected="true"] {
      outline: 3px solid #2f6df6 !important;
      outline-offset: 3px !important;
    }
    @media (max-width: 900px) {
      body { padding: 14px !important; }
      .deck-page-shell { margin-bottom: 22px; }
    }
  </style>
</head>
<body data-feixiang-deck-editor="true">
  ${pagesHtml}
</body>
</html>`;
    }

    function rebuildFeixiangDeckHtml(editDoc) {
      const parser = new DOMParser();
      const innerDoc = parser.parseFromString(currentSource.innerHtml, "text/html");
      const templates = Array.from(innerDoc.querySelectorAll("template.page-data"));
      const surfaces = Array.from(editDoc.querySelectorAll(".deck-slide-surface"));

      templates.forEach((template, index) => {
        if (surfaces[index]) {
          template.innerHTML = restorePageScripts(surfaces[index].innerHTML);
        }
      });

      const updatedInner = "<!DOCTYPE html>\n" + innerDoc.documentElement.outerHTML;
      return embedSrcdocIntoOuterHtml(updatedInner);
    }

    function embedSrcdocIntoOuterHtml(srcdocHtml) {
      const parser = new DOMParser();
      const outerDoc = parser.parseFromString(currentSource.outerHtml, "text/html");
      const iframe = outerDoc.querySelector("iframe[srcdoc]");
      if (!iframe) return srcdocHtml;
      iframe.setAttribute("srcdoc", srcdocHtml);
      return "<!DOCTYPE html>\n" + outerDoc.documentElement.outerHTML;
    }

    function protectPageScripts(html) {
      const scriptPattern = new RegExp("<script\\b([^>]*)>([\\s\\S]*?)<\\/" + "script>", "gi");
      return String(html).replace(scriptPattern, (match, attrs, code) => {
        const encoded = btoa(unescape(encodeURIComponent(code)));
        return "<" + `script type="text/plain" data-preserve-script="true" data-script-attrs="${escapeHtml(attrs || "")}" data-script-code="${encoded}"></` + "script>";
      });
    }

    function restorePageScripts(html) {
      const preservedPattern = new RegExp("<script\\b([^>]*)data-preserve-script=\"true\"([^>]*)><\\/" + "script>", "gi");
      return String(html).replace(preservedPattern, (match) => {
        const attrsMatch = match.match(/data-script-attrs="([^"]*)"/i);
        const codeMatch = match.match(/data-script-code="([^"]*)"/i);
        const attrs = attrsMatch ? decodeHtml(attrsMatch[1]) : "";
        const code = codeMatch ? decodeURIComponent(escape(atob(codeMatch[1]))) : "";
        return "<" + `script${attrs}>${code}</` + "script>";
      });
    }

    function decodeHtml(value) {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = value;
      return textarea.value;
    }

    function clampZoom(value) {
      return Math.max(0.4, Math.min(1.5, Number(value) || 1));
    }

    function computeFitZoom() {
      if (currentSource.type !== "feixiang-deck") return 1;
      const availableWidth = Math.max(360, editorFrame.clientWidth - 92);
      return clampZoom(Math.floor((availableWidth / 1280) * 100) / 100);
    }

    function captureZoomAnchor() {
      const doc = getEditorDocument();
      const win = editorFrame.contentWindow;
      const scroller = doc && doc.scrollingElement;
      if (!doc || !win || !scroller) return null;
      const point = selectedElement && doc.body.contains(selectedElement)
        ? (() => {
            const rect = selectedElement.getBoundingClientRect();
            return {
              x: Math.max(0, Math.min(win.innerWidth, rect.left + rect.width / 2)),
              y: Math.max(0, Math.min(win.innerHeight, rect.top + rect.height / 2))
            };
          })()
        : {
            x: Math.max(0, win.innerWidth / 2),
            y: Math.max(0, win.innerHeight / 2)
          };
      return {
        x: (scroller.scrollLeft + point.x) / Math.max(editorZoom, 0.01),
        y: (scroller.scrollTop + point.y) / Math.max(editorZoom, 0.01),
        point
      };
    }

    function restoreZoomAnchor(anchor) {
      if (!anchor) return;
      const doc = getEditorDocument();
      const win = editorFrame.contentWindow;
      const scroller = doc && doc.scrollingElement;
      if (!doc || !win || !scroller) return;
      requestAnimationFrame(() => {
        const nextLeft = Math.max(0, anchor.x * Math.max(editorZoom, 0.01) - anchor.point.x);
        const nextTop = Math.max(0, anchor.y * Math.max(editorZoom, 0.01) - anchor.point.y);
        scroller.scrollLeft = nextLeft;
        scroller.scrollTop = nextTop;
        win.scrollTo(nextLeft, nextTop);
        positionSelectionControls();
      });
    }

    function setEditorZoom(value, showMessage = true) {
      const anchor = captureZoomAnchor();
      const isFit = value === "fit";
      editorZoom = isFit ? computeFitZoom() : clampZoom(value);
      const select = $("#zoomSelect");
      if (select) {
        if (isFit) {
          select.value = "fit";
        } else {
          const options = Array.from(select.options).map((option) => Number(option.value)).filter((item) => !Number.isNaN(item));
          const closest = options.reduce((prev, curr) => Math.abs(curr - editorZoom) < Math.abs(prev - editorZoom) ? curr : prev, options[0]);
          select.value = String(closest);
        }
      }
      const doc = getEditorDocument();
      if (doc && doc.documentElement) {
        if (currentSource.type === "feixiang-deck") {
          doc.documentElement.style.setProperty("--deck-zoom", String(editorZoom));
          doc.body.style.zoom = "";
        } else {
          doc.body.style.zoom = String(editorZoom);
        }
        restoreZoomAnchor(anchor);
        requestAnimationFrame(() => refreshSelectionControls());
      }
      if (showMessage) toast(isFit ? `已适应画布：${Math.round(editorZoom * 100)}%` : `当前缩放：${Math.round(editorZoom * 100)}%`);
    }

    function stepZoom(delta) {
      const steps = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];
      const currentIndex = steps.findIndex((step) => step >= editorZoom - 0.001);
      const nextIndex = Math.max(0, Math.min(steps.length - 1, currentIndex + delta));
      setEditorZoom(steps[nextIndex]);
    }

    function injectEditorHelpers(doc) {
      const style = doc.createElement("style");
      style.setAttribute("data-editor-helper", "true");
      style.textContent = `
        [data-editor-selected="true"] {
          outline: 3px solid #2f6df6 !important;
          outline-offset: 3px !important;
        }
        [contenteditable="true"]:focus {
          outline: 2px dashed #11a683 !important;
          outline-offset: 2px !important;
        }
        .editor-resize-handle {
          position: fixed !important;
          box-sizing: border-box !important;
          z-index: 2147483647 !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 999px !important;
          background: #2563eb !important;
          border: 2px solid #ffffff !important;
          box-shadow: 0 3px 10px rgba(15, 23, 42, .28) !important;
        }
        .editor-resize-handle[data-dir="n"],
        .editor-resize-handle[data-dir="s"] {
          cursor: ns-resize !important;
        }
        .editor-resize-handle[data-dir="e"],
        .editor-resize-handle[data-dir="w"] {
          cursor: ew-resize !important;
        }
        .editor-resize-handle[data-dir="nw"],
        .editor-resize-handle[data-dir="se"] {
          cursor: nwse-resize !important;
        }
        .editor-resize-handle[data-dir="ne"],
        .editor-resize-handle[data-dir="sw"] {
          cursor: nesw-resize !important;
        }
        .editor-drag-handle {
          position: fixed !important;
          box-sizing: border-box !important;
          z-index: 2147483647 !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 8px !important;
          background: #10b981 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
          box-shadow: 0 3px 10px rgba(15, 23, 42, .24) !important;
          cursor: move !important;
          display: grid !important;
          place-items: center !important;
          font-size: 13px !important;
          font-family: Arial, sans-serif !important;
          line-height: 1 !important;
        }
        [data-editor-table-row="true"] > td,
        [data-editor-table-row="true"] > th,
        [data-editor-table-col="true"] {
          box-shadow: inset 0 0 0 3px rgba(37, 99, 235, .55) !important;
          background-color: rgba(37, 99, 235, .08) !important;
        }
      `;
      doc.head.appendChild(style);
    }

    function rememberTextSelection(doc) {
      const selection = doc.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
      const range = selection.getRangeAt(0);
      const text = range.toString();
      if (!text || !text.trim()) return false;
      savedTextRange = range.cloneRange();
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const target = node && node.closest ? node.closest("td, th, p, h1, h2, h3, h4, h5, h6, span, a, div, li, section, article") : node;
      if (target && target !== doc.body && target !== doc.documentElement) {
        selectElement(target);
      }
      return true;
    }

    function bindCanvasEvents(doc) {
      doc.addEventListener("mouseup", () => rememberTextSelection(doc));
      doc.addEventListener("keyup", () => rememberTextSelection(doc));

      doc.addEventListener("click", (event) => {
        const target = event.target;
        if (target && target.classList && (target.classList.contains("editor-resize-handle") || target.classList.contains("editor-drag-handle"))) return;
        if (!target || target === doc.body || target === doc.documentElement) return;
        event.preventDefault();
        event.stopPropagation();
        selectElement(target);
      }, true);

      doc.addEventListener("input", () => {
        updateMetrics("edit");
        setDocState("已修改，记得导出保存");
      });
    }

    function clearSelectionOutline() {
      const doc = getEditorDocument();
      if (!doc) return;
      doc.querySelectorAll(".editor-resize-handle").forEach((el) => el.remove());
      doc.querySelectorAll(".editor-drag-handle").forEach((el) => el.remove());
      doc.querySelectorAll("[data-editor-selected]").forEach((el) => {
        el.removeAttribute("data-editor-selected");
      });
      doc.querySelectorAll("[data-editor-table-row], [data-editor-table-col]").forEach((el) => {
        el.removeAttribute("data-editor-table-row");
        el.removeAttribute("data-editor-table-col");
      });
    }

    function selectElement(el) {
      clearSelectionOutline();
      selectedElement = el;
      selectedElement.setAttribute("data-editor-selected", "true");
      selectedCell = el.closest ? el.closest("td, th") : null;
      selectedTableMode = "cell";
      createResizeHandle(el);
      createDragHandle(el);
      renderPropertyPanel(el);
    }

    function refreshSelectionControls() {
      const doc = getEditorDocument();
      if (!doc || !selectedElement || !doc.body.contains(selectedElement)) return;
      doc.querySelectorAll(".editor-resize-handle, .editor-drag-handle").forEach((item) => item.remove());
      createResizeHandle(selectedElement);
      createDragHandle(selectedElement);
    }

    function positionSelectionControls() {
      const doc = getEditorDocument();
      if (!doc || !selectedElement || !doc.body.contains(selectedElement)) return;
      const rect = selectedElement.getBoundingClientRect();
      const points = {
        n: [rect.left + rect.width / 2, rect.top],
        e: [rect.right, rect.top + rect.height / 2],
        s: [rect.left + rect.width / 2, rect.bottom],
        w: [rect.left, rect.top + rect.height / 2],
        ne: [rect.right, rect.top],
        nw: [rect.left, rect.top],
        se: [rect.right, rect.bottom],
        sw: [rect.left, rect.bottom]
      };
      doc.querySelectorAll(".editor-resize-handle").forEach((handle) => {
        const point = points[handle.dataset.dir];
        if (!point) return;
        handle.style.left = `${point[0] - 6}px`;
        handle.style.top = `${point[1] - 6}px`;
      });
      doc.querySelectorAll(".editor-drag-handle").forEach((handle) => {
        handle.style.left = `${rect.left - 11}px`;
        handle.style.top = `${rect.top - 11}px`;
      });
    }

    function createResizeHandle(el) {
      const doc = getEditorDocument();
      if (!doc || !el || el === doc.body || el === doc.documentElement) return;
      doc.querySelectorAll(".editor-resize-handle").forEach((item) => item.remove());
      const handles = ["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((dir) => {
        const handle = doc.createElement("div");
        handle.className = "editor-resize-handle";
        handle.dataset.dir = dir;
        doc.documentElement.appendChild(handle);
        return handle;
      });

      function placeHandles() {
        positionSelectionControls();
      }

      function getLayoutSize(target) {
        const computed = doc.defaultView.getComputedStyle(target);
        const width = target.offsetWidth || parseFloat(computed.width) || target.getBoundingClientRect().width / Math.max(editorZoom, 0.01);
        const height = target.offsetHeight || parseFloat(computed.height) || target.getBoundingClientRect().height / Math.max(editorZoom, 0.01);
        return { width, height };
      }

      function getBoxExtras(target) {
        const computed = doc.defaultView.getComputedStyle(target);
        const horizontal = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight) + parseFloat(computed.borderLeftWidth) + parseFloat(computed.borderRightWidth);
        const vertical = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom) + parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
        return {
          horizontal: Number.isFinite(horizontal) ? horizontal : 0,
          vertical: Number.isFinite(vertical) ? vertical : 0,
          borderBox: computed.boxSizing === "border-box"
        };
      }

      function setElementOuterSize(target, outerWidth, outerHeight, dir) {
        const extras = getBoxExtras(target);
        target.style.setProperty("max-width", "none", "important");
        target.style.setProperty("max-height", "none", "important");
        if (dir.includes("e") || dir.includes("w")) {
          const cssWidth = extras.borderBox ? outerWidth : Math.max(1, outerWidth - extras.horizontal);
          setImportant(target, "width", `${Math.round(cssWidth)}px`);
        }
        if (dir.includes("n") || dir.includes("s")) {
          const cssHeight = extras.borderBox ? outerHeight : Math.max(1, outerHeight - extras.vertical);
          setImportant(target, "height", `${Math.round(cssHeight)}px`);
          setImportant(target, "min-height", "0");
        }
      }

      function ensureMovableForAnchoredResize(target) {
        const computed = doc.defaultView.getComputedStyle(target);
        if (!["relative", "absolute", "fixed"].includes(computed.position)) {
          target.style.setProperty("position", "relative", "important");
          if (!target.style.left) target.style.setProperty("left", "0px", "important");
          if (!target.style.top) target.style.setProperty("top", "0px", "important");
        }
        return {
          left: parseFloat(target.style.left || computed.left) || 0,
          top: parseFloat(target.style.top || computed.top) || 0
        };
      }

      function setAnchoredPosition(target, startPosition, startWidth, startHeight, nextWidth, nextHeight, dir) {
        if (!dir.includes("w") && !dir.includes("n")) return;
        const position = ensureMovableForAnchoredResize(target);
        const nextLeft = dir.includes("w") ? startPosition.left + startWidth - nextWidth : position.left;
        const nextTop = dir.includes("n") ? startPosition.top + startHeight - nextHeight : position.top;
        if (dir.includes("w")) target.style.setProperty("left", `${Math.round(nextLeft)}px`, "important");
        if (dir.includes("n")) target.style.setProperty("top", `${Math.round(nextTop)}px`, "important");
      }

      function getResizeScale() {
        return Math.max(editorZoom || 1, 0.01);
      }

      placeHandles();
      doc.defaultView.addEventListener("scroll", placeHandles, true);
      doc.defaultView.addEventListener("resize", placeHandles);

      handles.forEach((handle) => {
        handle.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          pushHistory();
          const dir = handle.dataset.dir;
          const startX = event.clientX;
          const startY = event.clientY;
          const { width: startWidth, height: startHeight } = getLayoutSize(selectedElement);
          const startPosition = ensureMovableForAnchoredResize(selectedElement);
          const ratio = startWidth / Math.max(startHeight, 1);
          const activeCell = selectedElement.closest ? selectedElement.closest("td, th") : null;
          const activeTable = activeCell ? activeCell.closest("table") : null;
          const tableColIndex = activeCell ? activeCell.cellIndex : -1;
          const previousCell = activeCell && tableColIndex > 0 ? activeCell.parentElement.cells[tableColIndex - 1] : null;
          const nextCell = activeCell && activeCell.parentElement.cells[tableColIndex + 1] ? activeCell.parentElement.cells[tableColIndex + 1] : null;
          const tableStartWidth = activeTable ? activeTable.getBoundingClientRect().width / getResizeScale() : 0;
          const tableStartColumnWidths = activeTable && activeTable.rows[0]
            ? Array.from(activeTable.rows[0].cells).map((cell) => cell.getBoundingClientRect().width / getResizeScale())
            : [];
          const previousStartWidth = previousCell ? (tableStartColumnWidths[tableColIndex - 1] || getLayoutSize(previousCell).width) : 0;
          const nextStartWidth = nextCell ? (tableStartColumnWidths[tableColIndex + 1] || getLayoutSize(nextCell).width) : 0;
          if (activeTable && (dir.includes("e") || dir.includes("w"))) {
            activeTable.style.setProperty("width", `${Math.round(tableStartWidth)}px`, "important");
            activeTable.style.setProperty("min-width", `${Math.round(tableStartWidth)}px`, "important");
            activeTable.style.setProperty("table-layout", "fixed", "important");
            tableStartColumnWidths.forEach((width, index) => setTableColumnWidth(activeTable, index, width));
          }
          let dragging = true;

          function setTableColumnWidth(table, colIndex, width) {
            if (!table || colIndex < 0) return;
            table.style.setProperty("table-layout", "fixed", "important");
            Array.from(table.rows).forEach((row) => {
              if (row.cells[colIndex]) {
                const cell = row.cells[colIndex];
                const extras = getBoxExtras(cell);
                const cssWidth = extras.borderBox ? width : Math.max(1, width - extras.horizontal);
                setImportant(cell, "width", `${Math.round(cssWidth)}px`);
              }
            });
          }

          function onMove(moveEvent) {
            if (!dragging) return;
            const scale = getResizeScale();
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;
            let nextWidth = startWidth;
            let nextHeight = startHeight;

            if (dir.includes("e")) nextWidth = startWidth + dx;
            if (dir.includes("w")) nextWidth = startWidth - dx;
            if (dir.includes("s")) nextHeight = startHeight + dy;
            if (dir.includes("n")) nextHeight = startHeight - dy;

            if (dir.length === 2) {
              const widthFromDelta = dir.includes("w") ? startWidth - dx : startWidth + dx;
              const heightFromDelta = dir.includes("n") ? startHeight - dy : startHeight + dy;
              if (Math.abs(widthFromDelta - startWidth) >= Math.abs((heightFromDelta - startHeight) * ratio)) {
                nextWidth = widthFromDelta;
                nextHeight = nextWidth / ratio;
              } else {
                nextHeight = heightFromDelta;
                nextWidth = nextHeight * ratio;
              }
            }

            nextWidth = Math.max(24, Math.round(nextWidth));
            nextHeight = Math.max(24, Math.round(nextHeight));

            if (activeCell && activeTable && (dir.includes("e") || dir.includes("w"))) {
              if (dir.includes("w") && previousCell) {
                const nextPreviousWidth = Math.max(24, previousStartWidth + dx);
                const adjustedWidth = Math.max(24, startWidth - dx);
                setTableColumnWidth(activeTable, tableColIndex - 1, nextPreviousWidth);
                setTableColumnWidth(activeTable, tableColIndex, adjustedWidth);
                nextWidth = adjustedWidth;
              } else if (dir.includes("e") && nextCell) {
                const adjustedWidth = Math.max(24, startWidth + dx);
                const nextNeighborWidth = Math.max(24, nextStartWidth - dx);
                setTableColumnWidth(activeTable, tableColIndex, adjustedWidth);
                setTableColumnWidth(activeTable, tableColIndex + 1, nextNeighborWidth);
                nextWidth = adjustedWidth;
              } else {
                setTableColumnWidth(activeTable, tableColIndex, nextWidth);
              }
            } else if (activeCell && activeTable && (selectedTableMode === "row" || dir.includes("n") || dir.includes("s"))) {
              applyTableDimension(activeTable, "height", nextHeight);
            } else {
              setAnchoredPosition(selectedElement, startPosition, startWidth, startHeight, nextWidth, nextHeight, dir);
              setElementOuterSize(selectedElement, nextWidth, nextHeight, dir);
            }
            positionSelectionControls();
            const widthInput = $("#widthValue");
            const heightInput = $("#heightValue");
            if (widthInput) widthInput.value = nextWidth;
            if (heightInput) heightInput.value = nextHeight;
          }

          function onUp() {
            dragging = false;
            doc.removeEventListener("mousemove", onMove);
            doc.removeEventListener("mouseup", onUp);
            doc.defaultView.removeEventListener("mousemove", onMove);
            doc.defaultView.removeEventListener("mouseup", onUp);
            afterEdit(dir.length === 2 ? "元素已等比缩放" : "元素尺寸已调整");
          }

          doc.addEventListener("mousemove", onMove);
          doc.addEventListener("mouseup", onUp);
          doc.defaultView.addEventListener("mousemove", onMove);
          doc.defaultView.addEventListener("mouseup", onUp);
        });
      });
    }

    function createDragHandle(el) {
      const doc = getEditorDocument();
      if (!doc || !el || el === doc.body || el === doc.documentElement) return;
      if (["TD", "TH", "TR", "TABLE", "THEAD", "TBODY"].includes(el.tagName)) return;
      doc.querySelectorAll(".editor-drag-handle").forEach((item) => item.remove());
      const handle = doc.createElement("div");
      handle.className = "editor-drag-handle";
      handle.textContent = "↕";
      doc.documentElement.appendChild(handle);

      function placeHandle() {
        positionSelectionControls();
      }

      placeHandle();
      doc.defaultView.addEventListener("scroll", placeHandle, true);
      doc.defaultView.addEventListener("resize", placeHandle);

      handle.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        pushHistory();
        const computed = doc.defaultView.getComputedStyle(selectedElement);
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = parseFloat(selectedElement.style.left || computed.left) || 0;
        const startTop = parseFloat(selectedElement.style.top || computed.top) || 0;
        if (computed.position === "static") {
          selectedElement.style.position = "relative";
          selectedElement.style.left = `${startLeft}px`;
          selectedElement.style.top = `${startTop}px`;
        }

        function onMove(moveEvent) {
          const nextLeft = startLeft + moveEvent.clientX - startX;
          const nextTop = startTop + moveEvent.clientY - startY;
          selectedElement.style.setProperty("left", `${Math.round(nextLeft)}px`, "important");
          selectedElement.style.setProperty("top", `${Math.round(nextTop)}px`, "important");
          positionSelectionControls();
        }

        function onUp() {
          doc.removeEventListener("mousemove", onMove);
          doc.removeEventListener("mouseup", onUp);
          afterEdit("位置已调整");
        }

        doc.addEventListener("mousemove", onMove);
        doc.addEventListener("mouseup", onUp);
      });
    }

    function renderEmptyPanel() {
      propertyPanel.innerHTML = `
        <div class="empty">请先点击画布中的文字、图片、表格或链接。</div>
        <div class="tool-group">
          <h3>新增元素</h3>
          <div class="table-tools">
            <button class="btn" id="insertTextBtn">文字</button>
            <button class="btn" id="insertBoxBtn">模块</button>
            <button class="btn" id="insertImageBtn">图片</button>
          </div>
        </div>
      `;
      bindInsertEvents();
    }

    function elementLabel(el) {
      const tag = el.tagName ? el.tagName.toLowerCase() : "element";
      const className = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      return `${tag}${className}`;
    }

    function renderPropertyPanel(el) {
      const tag = el.tagName.toLowerCase();
      const computed = getEditorDocument().defaultView.getComputedStyle(el);
      const isImage = tag === "img";
      const isLink = tag === "a";
      const table = el.closest("table");
      const rect = el.getBoundingClientRect();

      propertyPanel.innerHTML = `
        <div class="tag-pill">当前选中 <code>${elementLabel(el)}</code></div>

        ${!isImage ? `
          <div class="field">
            <label>文本内容</label>
            <textarea id="textValue">${escapeHtml(el.innerText || el.textContent || "")}</textarea>
          </div>
        ` : ""}

        ${isImage ? `
          <div class="field">
            <label>图片说明</label>
            <input id="altValue" value="${escapeHtml(el.getAttribute("alt") || "")}" placeholder="图片替代文字" />
          </div>
          <div class="field">
            <label>替换图片</label>
            <input id="imageInput" type="file" accept="image/*" />
          </div>
          <div class="field">
            <label>图片圆角</label>
            <input id="radiusValue" value="${parseInt(computed.borderRadius, 10) || 0}" type="number" min="0" max="100" />
          </div>
        ` : ""}

        ${isLink ? `
          <div class="field">
            <label>链接地址</label>
            <input id="hrefValue" value="${escapeHtml(el.getAttribute("href") || "")}" placeholder="https://example.com" />
          </div>
        ` : ""}

        ${!isImage ? `
          <div class="field">
            <label>字体</label>
            <select id="fontFamilyValue">
              <option value="">默认</option>
              <option value="Inter, sans-serif">Inter</option>
              <option value="PingFang SC, Microsoft YaHei, sans-serif">苹方 / 微软雅黑</option>
              <option value="SimSun, serif">宋体</option>
              <option value="SimHei, sans-serif">黑体</option>
              <option value="KaiTi, STKaiti, serif">楷体</option>
              <option value="FangSong, STFangsong, serif">仿宋</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Times New Roman, serif">Times New Roman</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="Courier New, monospace">Courier New</option>
            </select>
          </div>

          <div class="inline-fields">
            <div class="field">
              <label>字号</label>
              <input id="fontSizeValue" value="${parseInt(computed.fontSize, 10) || 16}" type="number" min="8" max="120" />
            </div>
            <div class="field">
              <label>加粗</label>
              <button class="toggle-btn" id="fontWeightToggleBtn" type="button">B</button>
            </div>
          </div>

          <div class="inline-fields">
            <div class="field">
              <label>文字颜色</label>
               <div class="color-picker">
                 <input id="colorValue" value="${rgbToHex(computed.color)}" type="color" aria-label="文字颜色" />
                 <span class="color-value" id="colorText">${rgbToHex(computed.color)}</span>
               </div>
            </div>
          </div>

          <div class="inline-fields">
            <div class="field">
              <label>背景色</label>
               <div class="color-picker">
                 <input id="bgValue" value="${rgbToHex(computed.backgroundColor)}" type="color" aria-label="背景色" />
                 <span class="color-value" id="bgText">${rgbToHex(computed.backgroundColor)}</span>
               </div>
            </div>
            <div class="field">
              <label>圆角</label>
              <input id="radiusValue" value="${parseInt(computed.borderRadius, 10) || 0}" type="number" min="0" max="100" />
            </div>
          </div>

          <label class="field">
            <label>对齐方式</label>
            <div class="segmented">
              <button data-align="left">左</button>
              <button data-align="center">中</button>
              <button data-align="right">右</button>
              <button data-align="justify">齐</button>
            </div>
          </label>
        ` : ""}

        <div class="inline-fields">
          <div class="field">
            <label>宽度</label>
            <input id="widthValue" value="${Math.round(rect.width) || 0}" type="number" min="1" />
          </div>
          <div class="field">
            <label>高度</label>
            <input id="heightValue" value="${Math.round(rect.height) || 0}" type="number" min="1" />
          </div>
        </div>

        <div class="inline-fields">
          <button class="btn danger" id="deleteElementBtn">删除元素</button>
        </div>

        ${table ? `
          <div class="tool-group">
            <h3>表格工具</h3>
            <div class="table-tools">
              <button class="btn" id="selectRowBtn">选中整行</button>
              <button class="btn" id="selectColBtn">选中整列</button>
              <button class="btn" id="addRowBtn">增加行</button>
              <button class="btn" id="deleteRowBtn">删除行</button>
              <button class="btn" id="addColBtn">增加列</button>
              <button class="btn" id="deleteColBtn">删除列</button>
            </div>
          </div>
        ` : ""}

        <div class="notice">画布中的文字也可以直接点击后输入。属性面板适合做结构化修改。</div>
      `;

      bindPropertyEvents(el, table);
    }

    function getSavedTextRangeFor(el) {
      if (!savedTextRange || !el) return null;
      const doc = getEditorDocument();
      let node = savedTextRange.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      if (!node || !doc.body.contains(node)) return null;
      if (node !== el && !el.contains(node)) return null;
      if (!savedTextRange.toString().trim()) return null;
      return savedTextRange;
    }

    function applyStyleToSelectedText(el, styles) {
      const range = getSavedTextRangeFor(el);
      if (!range) return false;
      const doc = getEditorDocument();
      const span = doc.createElement("span");
      Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          span.style.setProperty(property, value, "important");
        }
      });
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      savedTextRange = doc.createRange();
      savedTextRange.selectNodeContents(span);
      const selection = doc.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedTextRange);
      selectedElement = span;
      return true;
    }

    function applyTextStyleOrElement(el, property, value) {
      if (applyStyleToSelectedText(el, { [property]: value })) return;
      setImportant(el, property, value);
    }

    function clearTableSelection(table) {
      if (!table) return;
      table.querySelectorAll("[data-editor-table-row], [data-editor-table-col]").forEach((cell) => {
        cell.removeAttribute("data-editor-table-row");
        cell.removeAttribute("data-editor-table-col");
      });
    }

    function highlightTableSelection(table, mode) {
      if (!table || !selectedCell) return;
      selectedTableMode = mode;
      clearTableSelection(table);
      const row = selectedCell.parentElement;
      const colIndex = selectedCell.cellIndex;
      if (mode === "row") {
        Array.from(row.cells).forEach((cell) => cell.setAttribute("data-editor-table-row", "true"));
        toast("已选中整行");
      } else if (mode === "col") {
        Array.from(table.rows).forEach((tr) => {
          if (tr.cells[colIndex]) tr.cells[colIndex].setAttribute("data-editor-table-col", "true");
        });
        toast("已选中整列");
      }
    }

    function applyTableDimension(table, property, value) {
      if (!table || !selectedCell || !value) return false;
      const row = selectedCell.parentElement;
      const colIndex = selectedCell.cellIndex;
      if (selectedTableMode === "row" && property === "height") {
        Array.from(row.cells).forEach((cell) => setImportant(cell, "height", `${value}px`));
        return true;
      }
      if (selectedTableMode === "col" && property === "width") {
        table.style.setProperty("table-layout", "fixed", "important");
        Array.from(table.rows).forEach((tr) => {
          if (tr.cells[colIndex]) setImportant(tr.cells[colIndex], "width", `${value}px`);
        });
        return true;
      }
      return false;
    }

    function bindPropertyEvents(el, table) {
      const tag = el.tagName.toLowerCase();
      const isImage = tag === "img";

      const textValue = $("#textValue");
      if (textValue) {
        textValue.addEventListener("input", () => {
          pushHistory();
          el.innerText = textValue.value;
          afterEdit("文本已更新");
        });
      }

      const altValue = $("#altValue");
      if (altValue) {
        altValue.addEventListener("input", () => {
          el.setAttribute("alt", altValue.value);
          afterEdit("图片说明已更新");
        });
      }

      const imageInput = $("#imageInput");
      if (imageInput) {
        imageInput.addEventListener("change", async (event) => {
          const file = event.target.files && event.target.files[0];
          if (!file) return;
          pushHistory();
          const dataUrl = await fileToDataUrl(file);
          el.setAttribute("src", dataUrl);
          afterEdit("图片已替换，并会内嵌到导出的 HTML 中");
        });
      }

      const hrefValue = $("#hrefValue");
      if (hrefValue) {
        hrefValue.addEventListener("input", () => {
          el.setAttribute("href", hrefValue.value);
          afterEdit("链接已更新");
        });
      }

      /* --- auto-apply style fields --- */
      function updateResizeHandleAfterStyle(message) {
        createResizeHandle(el);
        afterEdit(message);
      }

      const styleHandlers = {
        fontSizeValue(input) {
          applyTextStyleOrElement(el, "font-size", `${input.value}px`);
        },
        colorValue(input) {
          applyTextStyleOrElement(el, "color", input.value);
          const colorText = $("#colorText");
          if (colorText) colorText.textContent = input.value.toUpperCase();
        },
        bgValue(input) {
          setImportant(el, "background-color", input.value);
          const bgText = $("#bgText");
          if (bgText) bgText.textContent = input.value.toUpperCase();
        },
        radiusValue(input) {
          setImportant(el, "border-radius", `${input.value}px`);
        },
        widthValue(input) {
          if (applyTableDimension(table, "width", input.value)) return;
          if (input.value) setImportant(el, "width", `${input.value}px`);
        },
        heightValue(input) {
          if (!input.value) return;
          if (applyTableDimension(table, "height", input.value)) return;
          setImportant(el, "height", `${input.value}px`);
          setImportant(el, "min-height", "0");
        }
      };

      Object.entries(styleHandlers).forEach(([id, handler]) => {
        const input = $(`#${id}`);
        if (!input) return;
        input.addEventListener("input", () => {
          pushHistory();
          handler(input);
          updateResizeHandleAfterStyle("样式已更新");
        });
      });

      /* --- font family --- */
      const fontFamilyValue = $("#fontFamilyValue");
      if (fontFamilyValue) {
        const currentFont = el.style.getPropertyValue("font-family") || "";
        fontFamilyValue.value = currentFont.replace(/!important/g, "").trim();
        fontFamilyValue.addEventListener("change", () => {
          pushHistory();
          if (fontFamilyValue.value) {
            applyTextStyleOrElement(el, "font-family", fontFamilyValue.value);
          } else {
            el.style.removeProperty("font-family");
          }
          afterEdit("字体已更新");
        });
      }

      /* --- font weight --- */
      const fontWeightToggleBtn = $("#fontWeightToggleBtn");
      if (fontWeightToggleBtn) {
        const currentWeight = el.style.getPropertyValue("font-weight") || "";
        const computedWeight = getEditorDocument().defaultView.getComputedStyle(el).fontWeight;
        let isBold = Number(currentWeight.replace(/!important/g, "").trim() || computedWeight) >= 700;
        fontWeightToggleBtn.classList.toggle("active", isBold);
        fontWeightToggleBtn.setAttribute("aria-pressed", String(isBold));
        fontWeightToggleBtn.addEventListener("click", () => {
          pushHistory();
          isBold = !isBold;
          if (isBold) {
            applyTextStyleOrElement(el, "font-weight", "700");
          } else {
            el.style.removeProperty("font-weight");
            applyTextStyleOrElement(el, "font-weight", "400");
          }
          fontWeightToggleBtn.classList.toggle("active", isBold);
          fontWeightToggleBtn.setAttribute("aria-pressed", String(isBold));
          afterEdit(isBold ? "已加粗" : "已取消加粗");
        });
      }

      /* --- alignment --- */
      document.querySelectorAll("[data-align]").forEach((btn) => {
        btn.addEventListener("click", () => {
          pushHistory();
          setImportant(el, "text-align", btn.dataset.align);
          afterEdit("对齐方式已修改");
        });
      });

      /* --- delete with confirmation --- */
      $("#deleteElementBtn").addEventListener("click", () => {
        if (!selectedElement) return;
        customConfirm("确认删除", "确定要删除当前选中的元素吗？删除后需要撤销才能恢复。").then((ok) => {
          if (!ok) return;
          pushHistory();
          const target = selectedElement;
          clearSelectionOutline();
          target.remove();
          selectedElement = null;
          selectedCell = null;
          renderEmptyPanel();
          afterEdit("元素已删除");
        });
      });

      if (table) {
        $("#selectRowBtn").addEventListener("click", () => highlightTableSelection(table, "row"));
        $("#selectColBtn").addEventListener("click", () => highlightTableSelection(table, "col"));
        $("#addRowBtn").addEventListener("click", () => addRow(table));
        $("#deleteRowBtn").addEventListener("click", () => deleteRow(table));
        $("#addColBtn").addEventListener("click", () => addCol(table));
        $("#deleteColBtn").addEventListener("click", () => deleteCol(table));
      }
    }

    function setImportant(el, property, value) {
      if (!el || value === undefined || value === null || value === "") return;
      el.style.setProperty(property, value, "important");
    }

    function bindInsertEvents() {
      const textBtn = $("#insertTextBtn");
      const boxBtn = $("#insertBoxBtn");
      const imageBtn = $("#insertImageBtn");
      if (textBtn) textBtn.addEventListener("click", () => insertElement("text"));
      if (boxBtn) boxBtn.addEventListener("click", () => insertElement("box"));
      if (imageBtn) imageBtn.addEventListener("click", () => insertElement("image"));
    }

    function getInsertTarget(doc) {
      if (selectedElement && selectedElement.closest) {
        const surface = selectedElement.closest(".deck-slide-surface");
        if (surface) return surface;
      }
      return doc.querySelector(".deck-slide-surface") || doc.body;
    }

    function insertElement(type) {
      const doc = getEditorDocument();
      if (!doc) return;
      pushHistory();
      const target = getInsertTarget(doc);
      let el;
      if (type === "image") {
        el = doc.createElement("img");
        el.alt = "新增图片";
        el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='270' viewBox='0 0 480 270'%3E%3Crect width='480' height='270' rx='18' fill='%23eef2ff'/%3E%3Cpath d='M96 194l70-82 56 58 38-42 124 66' fill='none' stroke='%232563eb' stroke-width='18' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='342' cy='82' r='24' fill='%2310b981'/%3E%3C/svg%3E";
        el.style.cssText = "width:240px;height:135px;object-fit:cover;border-radius:14px;margin:16px;";
      } else if (type === "box") {
        el = doc.createElement("div");
        el.textContent = "新增模块";
        el.style.cssText = "width:280px;min-height:120px;padding:22px;margin:16px;border-radius:18px;background:#eef2ff;color:#1f2937;font-weight:700;display:flex;align-items:center;justify-content:center;";
      } else {
        el = doc.createElement("p");
        el.textContent = "点击这里编辑新增文字";
        el.style.cssText = "font-size:24px;color:#1f2937;margin:16px;padding:8px;";
      }
      target.appendChild(el);
      selectElement(el);
      afterEdit("已新增元素");
    }

    function afterEdit(message) {
      updateMetrics("edit");
      setDocState("已修改，记得导出保存");
      toast(message);
    }

    function addRow(table) {
      pushHistory();
      const row = selectedCell ? selectedCell.parentElement : table.rows[table.rows.length - 1];
      const clone = row.cloneNode(true);
      clone.querySelectorAll("td, th").forEach((cell) => {
        cell.textContent = "新单元格";
      });
      row.after(clone);
      afterEdit("已增加一行");
    }

    function deleteRow(table) {
      if (table.rows.length <= 1) return toast("至少保留一行");
      pushHistory();
      const row = selectedCell ? selectedCell.parentElement : table.rows[table.rows.length - 1];
      row.remove();
      renderEmptyPanel();
      afterEdit("已删除一行");
    }

    function addCol(table) {
      pushHistory();
      const index = selectedCell ? selectedCell.cellIndex : table.rows[0].cells.length - 1;
      Array.from(table.rows).forEach((row) => {
        const sourceCell = row.cells[index] || row.cells[row.cells.length - 1];
        const newCell = sourceCell.cloneNode(false);
        newCell.textContent = row.parentElement.tagName.toLowerCase() === "thead" ? "新列" : "新单元格";
        sourceCell.after(newCell);
      });
      afterEdit("已增加一列");
    }

    function deleteCol(table) {
      const colCount = table.rows[0] ? table.rows[0].cells.length : 0;
      if (colCount <= 1) return toast("至少保留一列");
      pushHistory();
      const index = selectedCell ? selectedCell.cellIndex : colCount - 1;
      Array.from(table.rows).forEach((row) => {
        if (row.cells[index]) row.cells[index].remove();
      });
      renderEmptyPanel();
      afterEdit("已删除一列");
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function readTextFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function rgbToHex(rgb) {
      if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#ffffff";
      const match = rgb.match(/\d+/g);
      if (!match) return "#ffffff";
      return "#" + match.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    }

    async function downloadHtml() {
      const html = getFullHtml();
      if (!html) return toast("没有可导出的内容");
      trackEvent("export_start");
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const safeName = currentFileName.replace(/\.(html|htm)$/i, "") || "edited-page";
      const suggestedName = `${safeName}-edited.html`;
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: "HTML 文件",
              accept: { "text/html": [".html", ".htm"] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          updateMetrics("export");
          setDocState("已导出到你选择的位置");
          toast("导出成功");
          return;
        } catch (error) {
          if (error && error.name === "AbortError") {
            toast("已取消导出");
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      updateMetrics("export");
      setDocState("已导出到本地下载目录");
      toast("导出成功");
    }

    function showPreview() {
      trackEvent("preview_open");
      previewFrame.srcdoc = getFullHtml();
      $("#previewModal").classList.add("open");
      $("#previewModal").setAttribute("aria-hidden", "false");
    }

    function showCode() {
      trackEvent("source_open");
      $("#sourceText").value = getFullHtml();
      $("#sourceModal").classList.add("open");
      $("#sourceModal").setAttribute("aria-hidden", "false");
    }

    function clearCanvas() {
      resetSource();
      loadHtml("<!DOCTYPE html><html lang='zh-CN'><head><meta charset='UTF-8'><title>空白页面</title><style>body{font-family:sans-serif;padding:48px;color:#172033}</style></head><body><h1>空白 HTML 页面</h1><p>点击这段文字开始编辑。</p></body></html>", "空白页面.html");
      toast("画布已清空");
    }

    $("#uploadBtn").addEventListener("click", () => fileInput.click());
    $("#sampleBtn").addEventListener("click", () => {
      resetSource();
      loadHtml(sampleHtml, "示例页面.html");
      trackEvent("sample_load");
      toast("示例页面已载入");
    });
    $("#exportBtn").addEventListener("click", downloadHtml);
    $("#previewBtn").addEventListener("click", showPreview);
    $("#closePreviewBtn").addEventListener("click", () => {
      $("#previewModal").classList.remove("open");
      $("#previewModal").setAttribute("aria-hidden", "true");
      previewFrame.srcdoc = "";
    });
    $("#closeSourceBtn").addEventListener("click", () => {
      $("#sourceModal").classList.remove("open");
      $("#sourceModal").setAttribute("aria-hidden", "true");
    });
    $("#copySourceBtn").addEventListener("click", async () => {
      const sourceText = $("#sourceText");
      sourceText.focus();
      sourceText.select();
      try {
        await navigator.clipboard.writeText(sourceText.value);
        toast("源码已复制");
      } catch (error) {
        document.execCommand("copy");
        toast("源码已复制");
      }
    });
    $("#showCodeBtn").addEventListener("click", showCode);
    $("#feedbackBtn").addEventListener("click", () => {
      trackEvent("feedback_open");
      window.open("https://www.wenjuan.com/s/ueumemr/", "_blank", "noopener,noreferrer");
    });
    $("#privacyBtn").addEventListener("click", () => {
      trackEvent("privacy_open");
      $("#privacyModal").classList.add("open");
      $("#privacyModal").setAttribute("aria-hidden", "false");
    });
    $("#closeFeedbackBtn").addEventListener("click", () => {
      $("#feedbackModal").classList.remove("open");
      $("#feedbackModal").setAttribute("aria-hidden", "true");
    });
    $("#closePrivacyBtn").addEventListener("click", () => {
      $("#privacyModal").classList.remove("open");
      $("#privacyModal").setAttribute("aria-hidden", "true");
    });
    $("#clearBtn").addEventListener("click", () => {
      customConfirm("确认删除 HTML 文件", "确定要删除当前画布中的 HTML 文件吗？当前编辑内容会被替换为空白页面。").then((ok) => {
        if (!ok) return;
        clearCanvas();
      });
    });
    $("#zoomOutBtn").addEventListener("click", () => stepZoom(-1));
    $("#zoomInBtn").addEventListener("click", () => stepZoom(1));
    $("#zoomSelect").addEventListener("change", (event) => setEditorZoom(event.target.value));
    $("#undoBtn").addEventListener("click", () => {
      const current = captureEditorHtml();
      if (!undoStack.length) {
        toast(undoOverflow ? "最多只能撤5步" : "暂无可撤销内容");
        return;
      }
      if (current) {
        redoStack.push(current);
        if (redoStack.length > 5) redoStack.shift();
      }
      const previous = undoStack.pop();
      const scroll = getEditorScroll();
      restoreHtmlSnapshot(previous, {
        stateMessage: "已撤销上一步",
        scroll,
        inPlace: true
      });
      toast("已撤销上一步");
    });
    $("#redoBtn").addEventListener("click", () => {
      const current = captureEditorHtml();
      if (!redoStack.length) return toast("暂无可恢复内容");
      if (current) {
        undoStack.push(current);
        if (undoStack.length > 5) {
          undoStack.shift();
          undoOverflow = true;
        }
      }
      const next = redoStack.pop();
      const scroll = getEditorScroll();
      restoreHtmlSnapshot(next, {
        stateMessage: "已恢复上一步",
        scroll,
        inPlace: true
      });
      toast("已恢复上一步");
    });

    window.addEventListener("resize", () => {
      if (currentSource.type === "feixiang-deck" && $("#zoomSelect").value === "fit") {
        setEditorZoom("fit", false);
      }
    });

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/\.(html|htm)$/i.test(file.name)) {
        toast("请选择 HTML 文件");
        return;
      }
      try {
        const text = await readTextFile(file);
        const prepared = prepareHtmlForEditing(text);
        loadHtml(prepared.editHtml, file.name, prepared.message);
        updateMetrics("upload");
        trackEvent("file_loaded", { name: file.name, size: file.size, mode: currentSource.type });
        toast(prepared.message);
      } catch (error) {
        toast("文件读取失败");
      } finally {
        fileInput.value = "";
      }
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        downloadHtml();
      }
    });

    resetSource();
    loadHtml(sampleHtml, "示例页面.html");
    updateMetrics();
