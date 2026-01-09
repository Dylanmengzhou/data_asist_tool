// ==UserScript==
// @name         AGI Eval：URL 文本转可点击链接（稳）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @match        https://agi-eval.cn/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  // ============== 配置管理 ==============
  // 从URL获取taskId
  function getTaskId() {
    const url = new URL(window.location.href);
    return url.searchParams.get("taskId");
  }

  // 获取所有项目配置
  function getAllConfigs() {
    return GM_getValue("urlLinkifyConfigs", {});
  }

  // 获取当前项目配置
  function getProjectConfig(taskId) {
    const configs = getAllConfigs();
    return configs[taskId] || null;
  }

  // 保存项目配置
  function saveProjectConfig(taskId, config) {
    const configs = getAllConfigs();
    configs[taskId] = config;
    GM_setValue("urlLinkifyConfigs", configs);
    console.log(`[URL助手] 已保存 taskId=${taskId} 的配置:`, config);
  }

  // 删除项目配置
  function deleteProjectConfig(taskId) {
    const configs = getAllConfigs();
    delete configs[taskId];
    GM_setValue("urlLinkifyConfigs", configs);
  }

  // ============== 配置界面样式 ==============
  GM_addStyle(`
    #url-config-modal {
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
    #url-config-modal .modal-content {
      background: white;
      padding: 25px;
      border-radius: 10px;
      width: 500px;
      max-width: 90%;
      max-height: 80%;
      overflow-y: auto;
    }
    #url-config-modal h2 {
      margin: 0 0 20px 0;
      color: #333;
    }
    #url-config-modal label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #555;
    }
    #url-config-modal input, #url-config-modal textarea {
      width: 100%;
      padding: 8px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      box-sizing: border-box;
    }
    #url-config-modal textarea {
      height: 80px;
      font-family: monospace;
      font-size: 12px;
    }
    #url-config-modal .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    #url-config-modal button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      flex: 1;
    }
    #url-config-modal .btn-save {
      background: #4CAF50;
      color: white;
    }
    #url-config-modal .btn-cancel {
      background: #999;
      color: white;
    }
    #url-config-modal .btn-delete {
      background: #f44336;
      color: white;
    }
    #url-config-modal .hint {
      font-size: 12px;
      color: #888;
      margin-top: -10px;
      margin-bottom: 15px;
    }
    #url-config-btn {
      position: fixed;
      top: 10px;
      right: 120px;
      z-index: 99999;
      background: #722ed1;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
    }
    #url-config-btn:hover {
      background: #9254de;
    }
    #url-toast {
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(114, 46, 209, 0.9);
      color: #fff;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    #url-toast.show {
      opacity: 1;
    }
  `);

  // 显示提示消息
  function showToast(message, duration = 1500) {
    let toast = document.getElementById("url-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "url-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }

  // 显示配置弹窗
  function showConfigModal(taskId, existingConfig = null) {
    const isNew = !existingConfig;
    const config = existingConfig || {
      name: "",
      xpath:
        '//*[@id="root"]/div/div/div/main/div[2]/div[1]/div/div[1]/form/div/div[3]/div/div/div/div[3]/div[2]/div/div[2]/div/div/div',
    };

    const modal = document.createElement("div");
    modal.id = "url-config-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${isNew ? "🔗 配置URL链接化" : "🔗 编辑URL配置"}</h2>
        <p style="color:#666;margin-bottom:20px;">TaskId: <strong>${taskId}</strong></p>
        
        <label>项目名称（便于识别）</label>
        <input type="text" id="url-cfg-name" value="${
          config.name || ""
        }" placeholder="例如：图片标注项目">
        
        <label>URL所在元素的 XPath</label>
        <textarea id="url-cfg-xpath">${config.xpath || ""}</textarea>
        <div class="hint">包含URL文本的元素的XPath路径，脚本会自动提取其中的链接并转为可点击</div>
        
        <div class="btn-group">
          <button class="btn-save">💾 保存配置</button>
          <button class="btn-cancel">取消</button>
          ${!isNew ? '<button class="btn-delete">🗑️ 删除</button>' : ""}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 保存按钮
    modal.querySelector(".btn-save").addEventListener("click", () => {
      const newConfig = {
        name: document.getElementById("url-cfg-name").value,
        xpath: document.getElementById("url-cfg-xpath").value.trim(),
      };

      if (!newConfig.xpath) {
        alert("请填写URL所在元素的 XPath");
        return;
      }

      saveProjectConfig(taskId, newConfig);
      modal.remove();
      showToast("✅ 配置已保存！");
      // 重新启动linkify
      startLinkify(newConfig.xpath);
    });

    // 取消按钮
    modal.querySelector(".btn-cancel").addEventListener("click", () => {
      modal.remove();
    });

    // 删除按钮
    const deleteBtn = modal.querySelector(".btn-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("确定要删除此项目的配置吗？")) {
          deleteProjectConfig(taskId);
          modal.remove();
          showToast("✅ 配置已删除！");
          location.reload();
        }
      });
    }

    // 点击背景关闭
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 创建配置按钮
  function createConfigButton(taskId) {
    const btn = document.createElement("button");
    btn.id = "url-config-btn";
    btn.textContent = "🔗 URL配置";
    btn.addEventListener("click", () => {
      const config = getProjectConfig(taskId);
      showConfigModal(taskId, config);
    });
    document.body.appendChild(btn);
  }

  // ============== URL链接化功能 ==============
  const MARK = "data-tm-linkified"; // 防止重复处理

  function getNodeByXPath(xp) {
    return document.evaluate(
      xp,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }

  // 从文本中提取URL（匹配http://或https://开头的部分）
  function extractUrl(s) {
    const match = s.match(/https?:\/\/[^\s<>"'{}]+/i);
    return match ? match[0] : null;
  }

  function createLinkify(xpath) {
    return function linkify() {
      const el = getNodeByXPath(xpath);
      if (!el) {
        console.log("[URL助手] 未找到目标元素");
        return false;
      }

      // 已处理过就跳过（避免 observer/轮询反复改）
      if (el.getAttribute(MARK) === "1") {
        console.log("[URL助手] 元素已处理过，跳过");
        return true;
      }

      const text = (el.textContent || "").trim();
      console.log("[URL助手] 找到元素，文本内容:", text);

      if (!text) {
        console.log("[URL助手] 文本为空");
        return false;
      }

      // 用正则提取URL
      const url = extractUrl(text);
      console.log("[URL助手] 提取的URL:", url);

      if (!url) {
        console.log("[URL助手] 未匹配到URL");
        return false;
      }

      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.textDecoration = "underline";
      a.style.cursor = "pointer";
      a.style.color = "#1890ff";

      el.textContent = "";
      el.appendChild(a);
      el.setAttribute(MARK, "1");

      console.log("[URL助手] linkified 成功:", url);
      showToast(`🔗 已转换链接`);
      return true;
    };
  }

  function startLinkify(xpath) {
    const linkify = createLinkify(xpath);

    // 1) 先立刻尝试一次
    if (linkify()) return;

    // 2) 监听 #root
    const root = document.querySelector("#root") || document.documentElement;

    const obs = new MutationObserver(() => {
      linkify();
    });
    obs.observe(root, { childList: true, subtree: true });

    // 3) 轮询兜底
    const start = Date.now();
    const timer = setInterval(() => {
      if (linkify()) {
        clearInterval(timer);
        return;
      }
      if (Date.now() - start > 20000) {
        clearInterval(timer);
        console.log("[URL助手] timeout: not found or not a url yet");
      }
    }, 300);
  }

  // ============== 主逻辑 ==============
  const taskId = getTaskId();

  if (!taskId) {
    console.log("[URL助手] 未检测到 taskId，脚本不执行");
    return;
  }

  console.log(`[URL助手] 当前 taskId: ${taskId}`);

  // 创建配置按钮
  createConfigButton(taskId);

  // 获取当前项目配置
  const projectConfig = getProjectConfig(taskId);

  // 如果没有配置，弹出配置窗口
  if (!projectConfig) {
    console.log(`[URL助手] taskId=${taskId} 未配置，弹出配置窗口`);
    setTimeout(() => {
      showConfigModal(taskId, null);
    }, 1000);
    return;
  }

  console.log(`[URL助手] 使用配置:`, projectConfig);
  showToast(`🔗 ${projectConfig.name || "URL助手"}已启动`, 2000);

  // 启动URL链接化
  startLinkify(projectConfig.xpath);
})();
