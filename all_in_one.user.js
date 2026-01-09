// ==UserScript==
// @name         AGI Eval 数据标注助手（All in One）
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  整合：批量勾选、快捷键操作、URL链接化、元素监控
// @match        https://agi-eval.cn/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/Dylanmengzhou/data_asist_tool/main/all_in_one.user.js
// @downloadURL  https://raw.githubusercontent.com/Dylanmengzhou/data_asist_tool/main/all_in_one.user.js
// ==/UserScript==

(function () {
  "use strict";

  // ============== 全局配置管理 ==============
  function getTaskId() {
    const url = new URL(window.location.href);
    return url.searchParams.get("taskId");
  }

  function getAllConfigs() {
    return GM_getValue("agiEvalConfigs", {});
  }

  function getProjectConfig(taskId) {
    const configs = getAllConfigs();
    return configs[taskId] || null;
  }

  function saveProjectConfig(taskId, config) {
    const configs = getAllConfigs();
    configs[taskId] = config;
    GM_setValue("agiEvalConfigs", configs);
    console.log(`[助手] 已保存 taskId=${taskId} 的配置`);
  }

  function deleteProjectConfig(taskId) {
    const configs = getAllConfigs();
    delete configs[taskId];
    GM_setValue("agiEvalConfigs", configs);
  }

  // ============== 全局样式 ==============
  GM_addStyle(`
    /* 配置弹窗 */
    #agi-config-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #agi-config-modal .modal-content {
      background: white;
      padding: 25px;
      border-radius: 10px;
      width: 600px;
      max-width: 95%;
      max-height: 85vh;
      overflow-y: auto;
    }
    #agi-config-modal h2 {
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 10px;
    }
    #agi-config-modal h3 {
      margin: 20px 0 10px 0;
      color: #1890ff;
      font-size: 14px;
    }
    #agi-config-modal label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #555;
      font-size: 13px;
    }
    #agi-config-modal input, #agi-config-modal textarea {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      box-sizing: border-box;
      font-size: 12px;
    }
    #agi-config-modal textarea {
      height: 50px;
      font-family: monospace;
    }
    #agi-config-modal .hint {
      font-size: 11px;
      color: #888;
      margin-top: -8px;
      margin-bottom: 10px;
    }
    #agi-config-modal .section {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    #agi-config-modal .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    #agi-config-modal .section-toggle {
      cursor: pointer;
      user-select: none;
    }
    #agi-config-modal .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    #agi-config-modal button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      flex: 1;
      font-size: 14px;
    }
    #agi-config-modal .btn-save { background: #4CAF50; color: white; }
    #agi-config-modal .btn-draft { background: #1890ff; color: white; }
    #agi-config-modal .btn-cancel { background: #999; color: white; }
    #agi-config-modal .btn-delete { background: #f44336; color: white; }

    /* 配置按钮 */
    #agi-config-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 99999;
      background: #1890ff;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    #agi-config-btn:hover { background: #40a9ff; }

    /* Toast提示 */
    #agi-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    #agi-toast.show { opacity: 1; }

    /* 快捷键帮助面板 */
    #agi-help {
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 999998;
      max-width: 200px;
    }
    #agi-help .help-title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #1890ff;
    }
    #agi-help .help-key {
      display: inline-block;
      background: #333;
      padding: 2px 6px;
      border-radius: 3px;
      margin-right: 5px;
      font-family: monospace;
    }
    #agi-help .help-hide {
      position: absolute;
      top: 5px;
      right: 8px;
      cursor: pointer;
      color: #999;
    }
    #agi-help .help-hide:hover { color: #fff; }

    /* 勾选框输入容器 */
    #agi-checkbox-container {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 9999;
      background: rgba(255, 255, 255, 0.95);
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      cursor: grab;
      min-width: 140px;
    }
    #agi-checkbox-container .drag-header {
      font-size: 11px;
      color: #999;
      margin-bottom: 8px;
      user-select: none;
    }
    #agi-checkbox-container input {
      width: 100%;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid #ddd;
      border-radius: 5px;
      box-sizing: border-box;
    }
    #agi-checkbox-container .btn-row {
      display: flex;
      gap: 8px;
    }
    #agi-checkbox-container button {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
      color: white;
    }
    #agi-checkbox-container .btn-confirm { background: #4CAF50; }
    #agi-checkbox-container .btn-cancel { background: #f44336; }

    /* 元素监控容器 */
    #agi-monitor-container {
      position: fixed;
      top: 50px;
      right: 10px;
      z-index: 99998;
      max-width: 350px;
      max-height: 60vh;
      overflow-y: auto;
      background: #fff;
      border: 2px solid #52c41a;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 10px;
    }
    #agi-monitor-container .monitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
      margin-bottom: 8px;
      cursor: move;
    }
    #agi-monitor-container .monitor-title {
      font-weight: bold;
      color: #52c41a;
      font-size: 13px;
    }
    #agi-monitor-container .monitor-close {
      cursor: pointer;
      color: #999;
      font-size: 16px;
    }
    #agi-monitor-container .monitor-content {
      font-size: 12px;
      word-break: break-all;
    }
  `);

  // ============== 工具函数 ==============
  function showToast(message, duration = 1500) {
    let toast = document.getElementById("agi-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "agi-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  }

  function getElementByXPath(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (e) {
      console.error("[助手] XPath 解析错误:", xpath, e);
      return null;
    }
  }

  function makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    (handle || element).addEventListener("mousedown", (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "BUTTON" ||
        e.target.tagName === "TEXTAREA"
      )
        return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      element.style.transform = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      element.style.left = startLeft + e.clientX - startX + "px";
      element.style.top = startTop + e.clientY - startY + "px";
      element.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  // ============== 配置弹窗 ==============
  function showConfigModal(taskId, existingConfig = null) {
    const isNew = !existingConfig;
    const config = existingConfig || {
      name: "",
      // 勾选框配置
      enableCheckbox: true,
      checkboxBaseXpath: "",
      // 快捷键配置
      enableHotkey: true,
      dropdownTriggerXpath: "",
      dropdownSelector: ".ant-dropdown-menu-item",
      // URL链接化配置
      enableUrlLinkify: true,
      urlXpath: "",
      // 元素监控配置
      enableMonitor: false,
      monitorXpath: "",
      monitorClickXpath: "",
    };

    const modal = document.createElement("div");
    modal.id = "agi-config-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>⚙️ ${isNew ? "配置新项目" : "编辑项目配置"}</h2>
        <p style="color:#666;margin-bottom:15px;">TaskId: <strong>${taskId}</strong></p>
        
        <label>项目名称</label>
        <input type="text" id="cfg-name" value="${
          config.name || ""
        }" placeholder="便于识别的名称">
        
        <!-- 勾选框功能 -->
        <div class="section">
          <div class="section-header">
            <input type="checkbox" id="cfg-enableCheckbox" ${
              config.enableCheckbox ? "checked" : ""
            }>
            <label for="cfg-enableCheckbox" style="margin:0;cursor:pointer;">📦 批量勾选功能</label>
          </div>
          <label>表格行 XPath</label>
          <textarea id="cfg-checkboxXpath">${
            config.checkboxBaseXpath || ""
          }</textarea>
          <div class="hint">表格 tbody/tr 的路径，脚本会自动添加 [行号]/td[1]/label/span/input</div>
        </div>

        <!-- 快捷键功能 -->
        <div class="section">
          <div class="section-header">
            <input type="checkbox" id="cfg-enableHotkey" ${
              config.enableHotkey ? "checked" : ""
            }>
            <label for="cfg-enableHotkey" style="margin:0;cursor:pointer;">⌨️ 快捷键操作功能</label>
          </div>
          <label>下拉菜单触发按钮 XPath</label>
          <textarea id="cfg-dropdownTrigger">${
            config.dropdownTriggerXpath || ""
          }</textarea>
          <div class="hint">点击后弹出下拉菜单的按钮</div>
          <label>下拉菜单选项选择器</label>
          <input type="text" id="cfg-dropdownSelector" value="${
            config.dropdownSelector || ".ant-dropdown-menu-item"
          }">
        </div>

        <!-- URL链接化功能 -->
        <div class="section">
          <div class="section-header">
            <input type="checkbox" id="cfg-enableUrl" ${
              config.enableUrlLinkify ? "checked" : ""
            }>
            <label for="cfg-enableUrl" style="margin:0;cursor:pointer;">🔗 URL链接化功能</label>
          </div>
          <label>URL所在元素 XPath</label>
          <textarea id="cfg-urlXpath">${config.urlXpath || ""}</textarea>
          <div class="hint">包含URL文本的元素路径，自动转为可点击链接</div>
        </div>

        <!-- 元素监控功能 -->
        <div class="section">
          <div class="section-header">
            <input type="checkbox" id="cfg-enableMonitor" ${
              config.enableMonitor ? "checked" : ""
            }>
            <label for="cfg-enableMonitor" style="margin:0;cursor:pointer;">👁️ 粘贴质检报告到屏幕上</label>
          </div>
          <label>需要监控的元素 XPath</label>
          <textarea id="cfg-monitorXpath">${
            config.monitorXpath || ""
          }</textarea>
          <div class="hint">将此元素复制显示在屏幕上</div>
          <label>触发点击的元素 XPath（可选）</label>
          <textarea id="cfg-monitorClick">${
            config.monitorClickXpath || ""
          }</textarea>
          <div class="hint">如果需要先点击某元素才能显示内容，填写这里</div>
        </div>

        <div class="btn-group">
          <button class="btn-draft">📝 暂存</button>
          <button class="btn-save">💾 保存并刷新</button>
          <button class="btn-cancel">取消</button>
          ${!isNew ? '<button class="btn-delete">🗑️ 删除</button>' : ""}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 获取当前表单配置
    function getCurrentFormConfig() {
      return {
        name: document.getElementById("cfg-name").value,
        enableCheckbox: document.getElementById("cfg-enableCheckbox").checked,
        checkboxBaseXpath: document
          .getElementById("cfg-checkboxXpath")
          .value.trim(),
        enableHotkey: document.getElementById("cfg-enableHotkey").checked,
        dropdownTriggerXpath: document
          .getElementById("cfg-dropdownTrigger")
          .value.trim(),
        dropdownSelector:
          document.getElementById("cfg-dropdownSelector").value.trim() ||
          ".ant-dropdown-menu-item",
        enableUrlLinkify: document.getElementById("cfg-enableUrl").checked,
        urlXpath: document.getElementById("cfg-urlXpath").value.trim(),
        enableMonitor: document.getElementById("cfg-enableMonitor").checked,
        monitorXpath: document.getElementById("cfg-monitorXpath").value.trim(),
        monitorClickXpath: document
          .getElementById("cfg-monitorClick")
          .value.trim(),
      };
    }

    // 暂存（不刷新）
    modal.querySelector(".btn-draft").addEventListener("click", () => {
      const newConfig = getCurrentFormConfig();
      saveProjectConfig(taskId, newConfig);
      showToast("📝 配置已暂存（页面未刷新）");
    });

    // 保存并刷新
    modal.querySelector(".btn-save").addEventListener("click", () => {
      const newConfig = getCurrentFormConfig();
      saveProjectConfig(taskId, newConfig);
      modal.remove();
      showToast("✅ 配置已保存！页面将刷新");
      setTimeout(() => location.reload(), 500);
    });

    // 取消
    modal
      .querySelector(".btn-cancel")
      .addEventListener("click", () => modal.remove());

    // 删除
    const deleteBtn = modal.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("确定删除此项目配置？")) {
          deleteProjectConfig(taskId);
          modal.remove();
          showToast("✅ 配置已删除！");
          setTimeout(() => location.reload(), 500);
        }
      });
    }

    // 点击背景关闭
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ============== 功能1: 批量勾选 ==============
  function initCheckboxFeature(config) {
    if (!config.enableCheckbox || !config.checkboxBaseXpath) return;

    const container = document.createElement("div");
    container.id = "agi-checkbox-container";
    container.innerHTML = `
      <div class="drag-header">☰ 拖拽移动</div>
      <input type="number" id="agi-start" placeholder="起始行">
      <input type="number" id="agi-end" placeholder="结束行">
      <div class="btn-row">
        <button class="btn-confirm">勾选</button>
        <button class="btn-cancel">取消</button>
      </div>
    `;
    document.body.appendChild(container);
    makeDraggable(container);

    const baseXpath = config.checkboxBaseXpath;

    container.querySelector(".btn-confirm").addEventListener("click", () => {
      const start = parseInt(document.getElementById("agi-start").value) || 0;
      const end = parseInt(document.getElementById("agi-end").value) || 0;
      if (start <= 0 || end <= 0 || start > end) {
        alert("请输入有效范围");
        return;
      }
      operateCheckboxes(baseXpath, start, end, true);
    });

    container.querySelector(".btn-cancel").addEventListener("click", () => {
      const start = parseInt(document.getElementById("agi-start").value) || 0;
      const end = parseInt(document.getElementById("agi-end").value) || 0;
      if (start <= 0 || end <= 0 || start > end) {
        alert("请输入有效范围");
        return;
      }
      operateCheckboxes(baseXpath, start, end, false);
    });
  }

  function operateCheckboxes(baseXpath, start, end, check) {
    const allTrs = document.evaluate(
      baseXpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    let count = 0;

    for (let i = start; i <= end && i <= allTrs.snapshotLength; i++) {
      const checkboxXpath = `${baseXpath}[${i}]/td[1]/label/span/input`;
      const checkbox = getElementByXPath(checkboxXpath);
      if (checkbox) {
        if (check && !checkbox.checked) {
          checkbox.click();
          count++;
        } else if (!check && checkbox.checked) {
          checkbox.click();
          count++;
        }
      }
    }
    showToast(`✅ ${check ? "勾选" : "取消"}了 ${count} 行`);
  }

  // ============== 功能2: 快捷键操作 ==============
  function initHotkeyFeature(config) {
    if (!config.enableHotkey || !config.dropdownTriggerXpath) return;

    // 帮助面板
    const help = document.createElement("div");
    help.id = "agi-help";
    help.innerHTML = `
      <span class="help-hide">×</span>
      <div class="help-title">⌨️ ${config.name || "快捷键"}</div>
      <div><span class="help-key">Alt+1</span>批量反选</div>
      <div><span class="help-key">Alt+1</span>批量标注</div>
      <div><span class="help-key">Alt+1</span>批量删除</div>
      <div><span class="help-key">Alt+1</span>批量识别</div>
      <div><span class="help-key">Alt+1</span>批量分组</div>
      <div style="margin-top:5px;color:#999;font-size:10px;">Alt+H 显示/隐藏</div>
    `;
    document.body.appendChild(help);
    help
      .querySelector(".help-hide")
      .addEventListener("click", () => (help.style.display = "none"));

    // 键盘监听
    document.addEventListener("keydown", (e) => {
      if (!e.altKey) return;

      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        help.style.display = help.style.display === "none" ? "block" : "none";
        return;
      }

      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 5) {
        e.preventDefault();
        clickDropdownOption(config, keyNum);
      }
    });
  }

  function clickDropdownOption(config, index) {
    // 先点击触发按钮
    const trigger = getElementByXPath(config.dropdownTriggerXpath);
    if (trigger) trigger.click();

    setTimeout(() => {
      const items = document.querySelectorAll(config.dropdownSelector);
      const visibleItems = Array.from(items).filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (visibleItems.length === 0) {
        showToast("⚠️ 未找到下拉菜单");
        return;
      }

      if (index > visibleItems.length) {
        showToast(`⚠️ 选项${index}不存在`);
        return;
      }

      const el = visibleItems[index - 1];
      el.click();
      const text =
        el.querySelector(".ant-dropdown-menu-title-content")?.textContent ||
        el.textContent;
      showToast(`✅ ${text.trim()}`);
    }, 150);
  }

  // ============== 功能3: URL链接化 ==============
  function initUrlLinkifyFeature(config) {
    if (!config.enableUrlLinkify || !config.urlXpath) return;

    const MARK = "data-agi-linkified";

    function linkify() {
      const el = getElementByXPath(config.urlXpath);
      if (!el || el.getAttribute(MARK) === "1") return;

      const text = (el.textContent || "").trim();
      const match = text.match(/https?:\/\/[^\s<>"'{}]+/i);
      if (!match) return;

      const url = match[0];
      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      a.target = "_blank";
      a.style.cssText =
        "text-decoration:underline;cursor:pointer;color:#1890ff;";

      el.textContent = "";
      el.appendChild(a);
      el.setAttribute(MARK, "1");
      showToast("🔗 链接已转换");
    }

    // 立即尝试 + 监听 + 轮询
    linkify();
    const obs = new MutationObserver(linkify);
    obs.observe(document.querySelector("#root") || document.body, {
      childList: true,
      subtree: true,
    });

    const start = Date.now();
    const timer = setInterval(() => {
      linkify();
      if (Date.now() - start > 15000) clearInterval(timer);
    }, 500);
  }

  // ============== 功能4: 元素监控 ==============
  function initMonitorFeature(config) {
    if (!config.enableMonitor || !config.monitorXpath) return;

    const container = document.createElement("div");
    container.id = "agi-monitor-container";
    container.innerHTML = `
      <div class="monitor-header">
        <span class="monitor-title">👁️ 元素监控</span>
        <span class="monitor-close">×</span>
      </div>
      <div class="monitor-content">正在查找...</div>
    `;
    document.body.appendChild(container);

    container
      .querySelector(".monitor-close")
      .addEventListener("click", () => container.remove());
    makeDraggable(container, container.querySelector(".monitor-header"));

    let clickIntervalId = null;

    function updateMonitor() {
      const el = getElementByXPath(config.monitorXpath);
      const content = container.querySelector(".monitor-content");

      if (el) {
        content.innerHTML = el.cloneNode(true).outerHTML;
        // 找到内容后停止点击
        if (clickIntervalId) {
          clearInterval(clickIntervalId);
          clickIntervalId = null;
        }
      } else {
        content.innerHTML = '<span style="color:#999;">未找到元素</span>';
      }
    }

    // 如果配置了点击触发
    if (config.monitorClickXpath) {
      const clickTrigger = () => {
        const el = getElementByXPath(config.monitorClickXpath);
        if (el) el.click();
      };
      clickTrigger();
      clickIntervalId = setInterval(clickTrigger, 2000);
    }

    // 定时更新
    setTimeout(updateMonitor, 500);
    setInterval(updateMonitor, 3000);
  }

  // ============== 创建配置按钮 ==============
  function createConfigButton(taskId) {
    const btn = document.createElement("button");
    btn.id = "agi-config-btn";
    btn.textContent = "⚙️ 配置";
    btn.addEventListener("click", () => {
      showConfigModal(taskId, getProjectConfig(taskId));
    });
    document.body.appendChild(btn);
  }

  // ============== 主逻辑 ==============
  const taskId = getTaskId();

  if (!taskId) {
    console.log("[助手] 未检测到 taskId");
    return;
  }

  console.log(`[助手] taskId: ${taskId}`);

  // 配置按钮
  createConfigButton(taskId);

  // 获取配置
  const config = getProjectConfig(taskId);

  if (!config) {
    console.log("[助手] 未配置，弹出配置窗口");
    setTimeout(() => showConfigModal(taskId, null), 1000);
    return;
  }

  console.log("[助手] 使用配置:", config);
  showToast(`✅ ${config.name || "助手"}已启动`, 2000);

  // 启动各功能
  initCheckboxFeature(config);
  initHotkeyFeature(config);
  initUrlLinkifyFeature(config);
  initMonitorFeature(config);
})();
