// ==UserScript==
// @name         AGI Eval 数据标注助手（All in One）
// @namespace    http://tampermonkey.net/
// @version      1.0.3
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

    /* 勾选框侧边栏容器 */
    #agi-checkbox-container {
      position: fixed;
      right: 0;
      top: 30%;
      z-index: 9999;
      display: flex;
      align-items: flex-start;
    }
    #agi-checkbox-container .sidebar-tab {
      width: 24px;
      padding: 15px 3px;
      background: #1890ff;
      color: white;
      border-radius: 6px 0 0 6px;
      cursor: pointer;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 12px;
      text-align: center;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      user-select: none;
      margin-right: -1px;
    }
    #agi-checkbox-container .sidebar-tab:hover {
      background: #40a9ff;
    }
    #agi-checkbox-container .sidebar-content {
      background: rgba(255, 255, 255, 0.98);
      padding: 12px;
      border-radius: 6px 0 0 6px;
      box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      min-width: 150px;
      max-width: 180px;
      transform: translateX(100%);
      transition: transform 0.25s ease;
      border: 1px solid #e8e8e8;
      border-right: none;
      position: absolute;
      right: 0;
      top: 0;
    }
    #agi-checkbox-container.expanded .sidebar-content {
      transform: translateX(0);
    }
    #agi-checkbox-container.expanded .sidebar-tab {
      opacity: 0.3;
    }
    #agi-checkbox-container .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee;
    }
    #agi-checkbox-container .sidebar-title {
      font-size: 12px;
      font-weight: bold;
      color: #333;
    }
    #agi-checkbox-container .pin-btn {
      width: 22px;
      height: 22px;
      border: none;
      background: #f0f0f0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      padding: 0;
      line-height: 22px;
    }
    #agi-checkbox-container .pin-btn:hover {
      background: #e0e0e0;
    }
    #agi-checkbox-container .pin-btn.pinned {
      background: #1890ff;
      color: white;
    }
    #agi-checkbox-container input {
      width: 100%;
      padding: 6px 8px;
      margin-bottom: 6px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 12px;
    }
    #agi-checkbox-container .section-label {
      font-size: 10px;
      color: #888;
      margin-bottom: 4px;
      text-align: left;
    }
    #agi-checkbox-container .btn-row {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
    #agi-checkbox-container button.action-btn {
      flex: 1;
      padding: 5px 2px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      color: white;
    }
    #agi-checkbox-container .btn-confirm { background: #4CAF50; }
    #agi-checkbox-container .btn-cancel { background: #f44336; }
    #agi-checkbox-container .btn-clear { background: #999; }
    #agi-checkbox-container .btn-jump-confirm { background: #4CAF50; }
    #agi-checkbox-container .btn-jump-cancel { background: #f44336; }
    #agi-checkbox-container .btn-jump-clear { background: #999; }
    #agi-checkbox-container .divider {
      border-top: 1px dashed #ddd;
      margin: 8px 0;
    }

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
      <div class="sidebar-tab">📦 批量选择</div>
      <div class="sidebar-content">
        <div class="sidebar-header">
          <span class="sidebar-title">批量选择</span>
          <button class="pin-btn" title="钉住/取消钉住">📌</button>
        </div>
        <div class="section-label">连续选择</div>
        <input type="number" id="agi-start" placeholder="起始行">
        <input type="number" id="agi-end" placeholder="结束行">
        <div class="btn-row">
          <button class="action-btn btn-confirm">勾选</button>
          <button class="action-btn btn-cancel">取消</button>
          <button class="action-btn btn-clear">清空</button>
        </div>
        <div class="divider"></div>
        <div class="section-label">跳选（如: 2,6,7）</div>
        <input type="text" id="agi-jump" placeholder="行号，逗号分隔">
        <div class="btn-row">
          <button class="action-btn btn-jump-confirm">勾选</button>
          <button class="action-btn btn-jump-cancel">取消</button>
          <button class="action-btn btn-jump-clear">清空</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    const baseXpath = config.checkboxBaseXpath;
    const tab = container.querySelector(".sidebar-tab");
    const content = container.querySelector(".sidebar-content");
    const pinBtn = container.querySelector(".pin-btn");

    let isPinned = false;
    let autoCollapseTimer = null;

    // 展开侧边栏
    function expand() {
      container.classList.add("expanded");
      // 如果没钉住，启动自动收回计时器
      if (!isPinned) {
        startAutoCollapse();
      }
    }

    // 收起侧边栏
    function collapse() {
      if (isPinned) return; // 钉住状态不收起
      container.classList.remove("expanded");
      clearAutoCollapse();
    }

    // 启动自动收回计时器（3秒）
    function startAutoCollapse() {
      clearAutoCollapse();
      autoCollapseTimer = setTimeout(() => {
        collapse();
      }, 3000);
    }

    // 清除自动收回计时器
    function clearAutoCollapse() {
      if (autoCollapseTimer) {
        clearTimeout(autoCollapseTimer);
        autoCollapseTimer = null;
      }
    }

    // 点击标签展开/收起
    tab.addEventListener("click", () => {
      if (container.classList.contains("expanded")) {
        isPinned = false;
        pinBtn.classList.remove("pinned");
        collapse();
      } else {
        expand();
      }
    });

    // hover标签展开
    tab.addEventListener("mouseenter", () => {
      if (!container.classList.contains("expanded")) {
        expand();
      }
    });

    // 鼠标离开整个容器时，如果没钉住就启动计时器
    container.addEventListener("mouseleave", () => {
      if (!isPinned && container.classList.contains("expanded")) {
        startAutoCollapse();
      }
    });

    // 鼠标进入容器时清除计时器
    container.addEventListener("mouseenter", () => {
      if (container.classList.contains("expanded")) {
        clearAutoCollapse();
      }
    });

    // 钉住按钮
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isPinned = !isPinned;
      pinBtn.classList.toggle("pinned", isPinned);
      if (isPinned) {
        clearAutoCollapse();
        showToast("📌 已钉住");
      } else {
        startAutoCollapse();
        showToast("📌 已取消钉住");
      }
    });

    // 连续选择 - 勾选
    container.querySelector(".btn-confirm").addEventListener("click", () => {
      const start = parseInt(document.getElementById("agi-start").value) || 0;
      const end = parseInt(document.getElementById("agi-end").value) || 0;
      if (start <= 0 || end <= 0 || start > end) {
        alert("请输入有效范围");
        return;
      }
      operateCheckboxes(baseXpath, start, end, true);
    });

    // 连续选择 - 取消
    container.querySelector(".btn-cancel").addEventListener("click", () => {
      const start = parseInt(document.getElementById("agi-start").value) || 0;
      const end = parseInt(document.getElementById("agi-end").value) || 0;
      if (start <= 0 || end <= 0 || start > end) {
        alert("请输入有效范围");
        return;
      }
      operateCheckboxes(baseXpath, start, end, false);
    });

    // 连续选择 - 清空
    container.querySelector(".btn-clear").addEventListener("click", () => {
      document.getElementById("agi-start").value = "";
      document.getElementById("agi-end").value = "";
    });

    // 跳选 - 勾选
    container
      .querySelector(".btn-jump-confirm")
      .addEventListener("click", () => {
        const input = document.getElementById("agi-jump").value;
        const rows = parseJumpInput(input);
        if (rows.length === 0) {
          alert("请输入有效的行号，用逗号分隔");
          return;
        }
        operateCheckboxesByRows(baseXpath, rows, true);
      });

    // 跳选 - 取消
    container
      .querySelector(".btn-jump-cancel")
      .addEventListener("click", () => {
        const input = document.getElementById("agi-jump").value;
        const rows = parseJumpInput(input);
        if (rows.length === 0) {
          alert("请输入有效的行号，用逗号分隔");
          return;
        }
        operateCheckboxesByRows(baseXpath, rows, false);
      });

    // 跳选 - 清空
    container.querySelector(".btn-jump-clear").addEventListener("click", () => {
      document.getElementById("agi-jump").value = "";
    });
  }

  // 解析跳选输入（支持中英文逗号混合）
  function parseJumpInput(input) {
    // 把中文逗号替换成英文逗号，然后分割
    const normalized = input.replace(/，/g, ",");
    const parts = normalized.split(",");
    const rows = [];
    const seen = new Set();

    for (const part of parts) {
      const num = parseInt(part.trim(), 10);
      // 去重但保持输入顺序
      if (!isNaN(num) && num > 0 && !seen.has(num)) {
        rows.push(num);
        seen.add(num);
      }
    }

    return rows;
  }

  // 按指定行号操作勾选框（异步，带延迟）
  async function operateCheckboxesByRows(baseXpath, rows, check) {
    let count = 0;

    for (const row of rows) {
      const checkboxXpath = `${baseXpath}[${row}]/td[1]/label/span/input`;
      const checkbox = getElementByXPath(checkboxXpath);
      if (checkbox) {
        if (check && !checkbox.checked) {
          checkbox.click();
          count++;
          // 每次点击后等待一小段时间，确保DOM更新
          await new Promise((r) => setTimeout(r, 50));
        } else if (!check && checkbox.checked) {
          checkbox.click();
          count++;
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    }

    showToast(
      `✅ ${check ? "勾选" : "取消"}了 ${count} 行 (${rows.join(",")})`
    );
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
  let hotkeyHandler = null; // 保存事件处理函数引用，用于移除

  function initHotkeyFeature(config) {
    if (!config.enableHotkey || !config.dropdownTriggerXpath) return;

    // 先移除旧的键盘监听器（如果存在）
    if (hotkeyHandler) {
      document.removeEventListener("keydown", hotkeyHandler);
      hotkeyHandler = null;
    }

    // 帮助面板
    const help = document.createElement("div");
    help.id = "agi-help";
    help.innerHTML = `
      <span class="help-hide">×</span>
      <div class="help-title">⌨️ ${config.name || "快捷键"}</div>
      <div><span class="help-key">Alt+1</span>批量反选</div>
      <div><span class="help-key">Alt+2</span>批量标注</div>
      <div><span class="help-key">Alt+3</span>批量删除</div>
      <div><span class="help-key">Alt+4</span>批量识别</div>
      <div><span class="help-key">Alt+5</span>批量分组</div>
      <div style="margin-top:5px;color:#999;font-size:10px;">Alt+H 显示/隐藏</div>
    `;
    document.body.appendChild(help);
    help
      .querySelector(".help-hide")
      .addEventListener("click", () => (help.style.display = "none"));

    // 创建键盘监听函数
    hotkeyHandler = (e) => {
      if (!e.altKey) return;

      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        const helpEl = document.getElementById("agi-help");
        if (helpEl) {
          helpEl.style.display =
            helpEl.style.display === "none" ? "block" : "none";
        }
        return;
      }

      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 5) {
        e.preventDefault();
        clickDropdownOption(config, keyNum);
      }
    };

    // 添加键盘监听
    document.addEventListener("keydown", hotkeyHandler);
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
    let updateIntervalId = null;
    let foundValidContent = false;

    function updateMonitor() {
      const el = getElementByXPath(config.monitorXpath);
      const content = container.querySelector(".monitor-content");

      if (el) {
        const cloned = el.cloneNode(true);
        const text = (el.textContent || "").trim();

        // 检查是否有实际内容（不是空的或者只有空白）
        if (text.length > 0) {
          content.innerHTML = cloned.outerHTML;

          // 找到有效内容后才停止点击
          if (!foundValidContent) {
            foundValidContent = true;
            console.log("[助手] 找到有效内容，停止点击");
            if (clickIntervalId) {
              clearInterval(clickIntervalId);
              clickIntervalId = null;
            }
          }
        } else {
          content.innerHTML =
            '<span style="color:#f90;">元素存在但内容为空，继续等待...</span>';
        }
      } else {
        content.innerHTML =
          '<span style="color:#999;">未找到元素，继续尝试...</span>';
      }
    }

    // 如果配置了点击触发
    if (config.monitorClickXpath) {
      const clickTrigger = () => {
        // 只有还没找到有效内容时才继续点击
        if (foundValidContent) return;

        const el = getElementByXPath(config.monitorClickXpath);
        if (el) {
          el.click();
          console.log("[助手] 点击触发元素");
          // 点击后等待一段时间再更新
          setTimeout(updateMonitor, 300);
        }
      };

      // 立即点击一次
      setTimeout(clickTrigger, 500);
      // 每1.5秒尝试点击一次（加快频率）
      clickIntervalId = setInterval(clickTrigger, 1500);

      // 30秒后如果还没找到就停止点击（防止无限点击）
      setTimeout(() => {
        if (clickIntervalId && !foundValidContent) {
          clearInterval(clickIntervalId);
          clickIntervalId = null;
          console.log("[助手] 超时，停止点击");
          const content = container.querySelector(".monitor-content");
          if (!foundValidContent) {
            content.innerHTML =
              '<span style="color:#f44336;">超时未找到内容，请检查XPath配置</span>';
          }
        }
      }, 30000);
    }

    // 定时更新显示（每2秒）
    setTimeout(updateMonitor, 800);
    updateIntervalId = setInterval(updateMonitor, 2000);
  }

  // ============== 创建配置按钮 ==============
  function createConfigButton(taskId) {
    // 先移除旧的按钮（如果存在）
    const oldBtn = document.getElementById("agi-config-btn");
    if (oldBtn) oldBtn.remove();

    const btn = document.createElement("button");
    btn.id = "agi-config-btn";
    btn.textContent = "⚙️ 配置";
    btn.addEventListener("click", () => {
      showConfigModal(taskId, getProjectConfig(taskId));
    });
    document.body.appendChild(btn);
  }

  // ============== 清理旧的UI元素 ==============
  function cleanupUI() {
    const ids = [
      "agi-checkbox-container",
      "agi-help",
      "agi-monitor-container",
      "agi-config-btn",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // ============== 初始化所有功能 ==============
  function initAllFeatures(taskId) {
    console.log(`[助手] 初始化功能，taskId: ${taskId}`);

    // 先清理旧的UI
    cleanupUI();

    // 创建配置按钮
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
  }

  // ============== URL变化检测（SPA支持） ==============
  let lastUrl = window.location.href;
  let lastTaskId = null;

  function checkUrlChange() {
    const currentUrl = window.location.href;
    const currentTaskId = getTaskId();

    // URL或taskId变化时重新初始化
    if (currentUrl !== lastUrl || currentTaskId !== lastTaskId) {
      console.log(`[助手] URL变化: ${lastUrl} -> ${currentUrl}`);
      lastUrl = currentUrl;
      lastTaskId = currentTaskId;

      if (currentTaskId) {
        // 延迟一点让页面先加载
        setTimeout(() => initAllFeatures(currentTaskId), 500);
      } else {
        // 没有taskId时清理UI
        cleanupUI();
      }
    }
  }

  // 监听 popstate（浏览器前进/后退）
  window.addEventListener("popstate", () => {
    setTimeout(checkUrlChange, 100);
  });

  // 监听 pushState 和 replaceState（SPA路由）
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(checkUrlChange, 100);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(checkUrlChange, 100);
  };

  // 定期检查URL变化（兜底方案，每2秒检查一次）
  setInterval(checkUrlChange, 2000);

  // ============== 主逻辑 ==============
  const taskId = getTaskId();
  lastTaskId = taskId;

  if (!taskId) {
    console.log("[助手] 未检测到 taskId");
    return;
  }

  console.log(`[助手] taskId: ${taskId}`);

  // 初始化
  initAllFeatures(taskId);
})();
