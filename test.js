// ==UserScript==
// @name         自动勾选框框并添加输入框
// @match        https://agi-eval.cn/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // ============== 配置管理 ==============
  // 从URL获取taskId
  function getTaskId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('taskId');
  }

  // 获取所有项目配置
  function getAllConfigs() {
    return GM_getValue('projectConfigs', {});
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
    GM_setValue('projectConfigs', configs);
    console.log(`已保存 taskId=${taskId} 的配置:`, config);
  }

  // 删除项目配置
  function deleteProjectConfig(taskId) {
    const configs = getAllConfigs();
    delete configs[taskId];
    GM_setValue('projectConfigs', configs);
  }

  // ============== 配置界面 ==============
  GM_addStyle(`
    #config-modal {
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
    #config-modal .modal-content {
      background: white;
      padding: 25px;
      border-radius: 10px;
      width: 500px;
      max-width: 90%;
      max-height: 80%;
      overflow-y: auto;
    }
    #config-modal h2 {
      margin: 0 0 20px 0;
      color: #333;
    }
    #config-modal label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #555;
    }
    #config-modal input, #config-modal textarea {
      width: 100%;
      padding: 8px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      box-sizing: border-box;
    }
    #config-modal textarea {
      height: 60px;
      font-family: monospace;
      font-size: 12px;
    }
    #config-modal .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    #config-modal button {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      flex: 1;
    }
    #config-modal .btn-save {
      background: #4CAF50;
      color: white;
    }
    #config-modal .btn-cancel {
      background: #999;
      color: white;
    }
    #config-modal .btn-delete {
      background: #f44336;
      color: white;
    }
    #config-modal .hint {
      font-size: 12px;
      color: #888;
      margin-top: -10px;
      margin-bottom: 15px;
    }
    #config-btn {
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
    }
    #config-btn:hover {
      background: #40a9ff;
    }
  `);

  // 显示配置弹窗
  function showConfigModal(taskId, existingConfig = null) {
    const isNew = !existingConfig;
    const config = existingConfig || {
      name: '',
      baseXpath: '//*[@id="root"]/div/div/main/div/div/div[2]/div/div/div/form/div/div[3]/div/div/div/div[3]/div[3]/div/div/div/div/div/table/tbody/tr',
      dropdownTriggerXpath: '//*[@id="root"]/div/div/main/div/div/div[2]/div/div/div/form/div/div[3]/div/div/div/div[3]/div[1]/div/button[2]/span',
      dropdownSelector: '.ant-dropdown-menu-item'
    };

    const modal = document.createElement('div');
    modal.id = 'config-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${isNew ? '⚙️ 配置新项目' : '⚙️ 编辑项目配置'}</h2>
        <p style="color:#666;margin-bottom:20px;">TaskId: <strong>${taskId}</strong></p>
        
        <label>项目名称（便于识别）</label>
        <input type="text" id="cfg-name" value="${config.name || ''}" placeholder="例如：图片标注项目">
        
        <label>勾选框所在行的 XPath</label>
        <textarea id="cfg-baseXpath">${config.baseXpath || ''}</textarea>
        <div class="hint">表格行的 XPath，脚本会自动在后面添加 [行号]/td[1]/label/span/input</div>
        
        <label>下拉菜单触发按钮 XPath</label>
        <textarea id="cfg-dropdownTrigger">${config.dropdownTriggerXpath || ''}</textarea>
        <div class="hint">点击后会弹出下拉菜单的按钮</div>
        
        <label>下拉菜单选项 CSS 选择器</label>
        <input type="text" id="cfg-dropdownSelector" value="${config.dropdownSelector || '.ant-dropdown-menu-item'}">
        <div class="hint">通常是 .ant-dropdown-menu-item</div>
        
        <div class="btn-group">
          <button class="btn-save">💾 保存配置</button>
          <button class="btn-cancel">取消</button>
          ${!isNew ? '<button class="btn-delete">🗑️ 删除</button>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 保存按钮
    modal.querySelector('.btn-save').addEventListener('click', () => {
      const newConfig = {
        name: document.getElementById('cfg-name').value,
        baseXpath: document.getElementById('cfg-baseXpath').value.trim(),
        dropdownTriggerXpath: document.getElementById('cfg-dropdownTrigger').value.trim(),
        dropdownSelector: document.getElementById('cfg-dropdownSelector').value.trim()
      };
      
      if (!newConfig.baseXpath) {
        alert('请填写勾选框所在行的 XPath');
        return;
      }
      
      saveProjectConfig(taskId, newConfig);
      modal.remove();
      alert('✅ 配置已保存！页面将刷新以应用新配置。');
      location.reload();
    });

    // 取消按钮
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.remove();
    });

    // 删除按钮
    const deleteBtn = modal.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm('确定要删除此项目的配置吗？')) {
          deleteProjectConfig(taskId);
          modal.remove();
          alert('✅ 配置已删除！');
          location.reload();
        }
      });
    }

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 创建配置按钮
  function createConfigButton(taskId) {
    const btn = document.createElement('button');
    btn.id = 'config-btn';
    btn.textContent = '⚙️ XPath配置';
    btn.addEventListener('click', () => {
      const config = getProjectConfig(taskId);
      showConfigModal(taskId, config);
    });
    document.body.appendChild(btn);
  }

  // ============== 快捷键选择样式 ==============
  GM_addStyle(`
    #qs-toast {
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
    #qs-toast.show {
      opacity: 1;
    }
    #qs-help {
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
    #qs-help .qs-title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #1890ff;
    }
    #qs-help .qs-key {
      display: inline-block;
      background: #333;
      padding: 2px 6px;
      border-radius: 3px;
      margin-right: 5px;
      font-family: monospace;
    }
    #qs-help .qs-hide-btn {
      position: absolute;
      top: 5px;
      right: 8px;
      cursor: pointer;
      color: #999;
    }
    #qs-help .qs-hide-btn:hover {
      color: #fff;
    }
  `);

  // ============== 主逻辑 ==============
  const taskId = getTaskId();
  
  if (!taskId) {
    console.log('未检测到 taskId，脚本不执行');
    return;
  }

  console.log(`当前 taskId: ${taskId}`);
  
  // 获取当前项目配置
  let projectConfig = getProjectConfig(taskId);
  
  // 创建配置按钮
  createConfigButton(taskId);
  
  // 如果没有配置，弹出配置窗口
  if (!projectConfig) {
    console.log(`taskId=${taskId} 未配置，弹出配置窗口`);
    setTimeout(() => {
      showConfigModal(taskId, null);
    }, 1000);
    return; // 等待用户配置后再执行
  }

  console.log(`使用配置:`, projectConfig);

  // 使用配置的值
  const HOTKEY_MODIFIER = 'altKey';
  const DROPDOWN_TRIGGER_XPATH = projectConfig.dropdownTriggerXpath;
  const DROPDOWN_SELECTOR = projectConfig.dropdownSelector;
  const baseXpath = projectConfig.baseXpath;

  // ============== 快捷键选择功能 ==============
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
      console.error("XPath 解析错误:", xpath, e);
      return null;
    }
  }

  function openDropdown() {
    const trigger = getElementByXPath(DROPDOWN_TRIGGER_XPATH);
    if (trigger) {
      trigger.click();
      console.log('已点击下拉菜单触发按钮');
      return true;
    }
    console.log('未找到下拉菜单触发按钮');
    return false;
  }

  function showToast(message, duration = 1500) {
    let toast = document.getElementById('qs-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'qs-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  function clickOption(index) {
    openDropdown();
    setTimeout(() => {
      const items = document.querySelectorAll(DROPDOWN_SELECTOR);
      const visibleItems = Array.from(items).filter(item => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (visibleItems.length === 0) {
        showToast(`⚠️ 未找到下拉菜单选项`);
        return false;
      }

      if (index > visibleItems.length) {
        showToast(`⚠️ 选项 ${index} 不存在，共有 ${visibleItems.length} 个选项`);
        return false;
      }

      const element = visibleItems[index - 1];
      if (element) {
        element.click();
        const text = element.querySelector('.ant-dropdown-menu-title-content')?.textContent || element.textContent;
        showToast(`✅ 已选择: ${text.trim()}`);
        console.log(`已点击选项 ${index}:`, text);
        return true;
      }
      return false;
    }, 150);
  }

  function createHelpPanel() {
    const config = projectConfig;
    const help = document.createElement('div');
    help.id = 'qs-help';
    help.innerHTML = `
      <span class="qs-hide-btn" title="隐藏提示">×</span>
      <div class="qs-title">⌨️ ${config.name || 'TaskId: ' + taskId}</div>
      <div><span class="qs-key">Alt+1~5</span>快捷选择</div>
      <div style="margin-top:5px;color:#999;font-size:10px;">按 Alt+H 显示/隐藏</div>
    `;
    document.body.appendChild(help);
    help.querySelector('.qs-hide-btn').addEventListener('click', () => {
      help.style.display = 'none';
    });
  }

  function setupKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      if (!e[HOTKEY_MODIFIER]) return;

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const help = document.getElementById('qs-help');
        if (help) {
          help.style.display = help.style.display === 'none' ? 'block' : 'none';
        }
        return;
      }

      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 5) {
        e.preventDefault();
        clickOption(keyNum);
      }
    });
  }

  // ============== 勾选框功能 ==============
  function makeDraggable(container, dragHandle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    dragHandle.addEventListener("mousedown", (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
        return;
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      container.style.transform = 'none';
      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      container.style.left = (startLeft + deltaX) + 'px';
      container.style.top = (startTop + deltaY) + 'px';
      container.style.right = 'auto';
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'grab';
      }
    });
  }

  const createContainer = () => {
    const container = document.createElement("div");
    container.id = "inputContainer";
    container.style.position = "fixed";
    container.style.right = "20px";
    container.style.top = "50%";
    container.style.transform = "translateY(-50%)";
    container.style.zIndex = "9999";
    container.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    container.style.padding = "20px";
    container.style.borderRadius = "10px";
    container.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    container.style.textAlign = "center";
    container.style.opacity = "0.1";
    container.style.transition = "opacity 0.3s ease";
    container.style.cursor = "grab";

    const dragHeader = document.createElement("div");
    dragHeader.textContent = "☰ 拖拽移动";
    dragHeader.style.fontSize = "12px";
    dragHeader.style.color = "#999";
    dragHeader.style.marginBottom = "10px";
    dragHeader.style.cursor = "grab";
    dragHeader.style.userSelect = "none";

    container.addEventListener("mouseenter", () => {
      container.style.opacity = "1";
    });
    container.addEventListener("mouseleave", () => {
      container.style.opacity = "0.1";
    });

    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.placeholder = "起始";
    startInput.id = "startInput";
    startInput.style.marginBottom = "10px";
    startInput.style.padding = "10px";
    startInput.style.borderRadius = "5px";
    startInput.style.width = "100%";

    const endInput = document.createElement("input");
    endInput.type = "number";
    endInput.placeholder = "结束";
    endInput.id = "endInput";
    endInput.style.marginBottom = "20px";
    endInput.style.padding = "10px";
    endInput.style.borderRadius = "5px";
    endInput.style.width = "100%";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "10px";

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "确认";
    confirmButton.style.padding = "10px 20px";
    confirmButton.style.borderRadius = "5px";
    confirmButton.style.backgroundColor = "#4CAF50";
    confirmButton.style.color = "white";
    confirmButton.style.border = "none";
    confirmButton.style.cursor = "pointer";
    confirmButton.style.flex = "1";
    confirmButton.addEventListener("click", handleConfirmClick);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "取消选择";
    cancelButton.style.padding = "10px 20px";
    cancelButton.style.borderRadius = "5px";
    cancelButton.style.backgroundColor = "#f44336";
    cancelButton.style.color = "white";
    cancelButton.style.border = "none";
    cancelButton.style.cursor = "pointer";
    cancelButton.style.flex = "1";
    cancelButton.addEventListener("click", handleCancelClick);

    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);

    container.appendChild(dragHeader);
    container.appendChild(startInput);
    container.appendChild(endInput);
    container.appendChild(buttonContainer);

    document.body.appendChild(container);
    makeDraggable(container, container);
  };

  const handleConfirmClick = () => {
    const startInput = document.getElementById("startInput");
    const endInput = document.getElementById("endInput");

    const start = parseInt(startInput.value, 10) || 0;
    const end = parseInt(endInput.value, 10) || 0;

    if (start < 0 || end < 0 || start > end) {
      alert("请输入有效的起始和结束范围");
      return;
    }

    console.log(`勾选范围：${start} - ${end}`);
    checkCheckboxes(start, end);
  };

  const handleCancelClick = () => {
    const startInput = document.getElementById("startInput");
    const endInput = document.getElementById("endInput");

    const start = parseInt(startInput.value, 10) || 0;
    const end = parseInt(endInput.value, 10) || 0;

    if (start < 0 || end < 0 || start > end) {
      alert("请输入有效的起始和结束范围");
      return;
    }

    console.log(`取消勾选范围：${start} - ${end}`);
    uncheckCheckboxes(start, end);
  };

  const checkCheckboxes = (start, end) => {
    const allTrs = document.evaluate(
      baseXpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    console.log("总行数:", allTrs.snapshotLength);

    for (let i = start; i <= end && i < allTrs.snapshotLength; i++) {
      const checkboxXpath = `${baseXpath}[${i}]/td[1]/label/span/input`;
      const checkboxResult = document.evaluate(
        checkboxXpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const checkbox = checkboxResult.singleNodeValue;

      if (checkbox) {
        if (!checkbox.checked) {
          checkbox.click();
          console.log(`勾选了第 ${i} 行`);
        } else {
          console.log(`第 ${i} 行已经被勾选`);
        }
      } else {
        console.log(`未找到第 ${i} 行的checkbox`);
      }
    }

    console.log(`完成勾选，范围: ${start} - ${end}`);
  };

  const uncheckCheckboxes = (start, end) => {
    const allTrs = document.evaluate(
      baseXpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    for (let i = start; i <= end && i < allTrs.snapshotLength; i++) {
      const checkboxXpath = `${baseXpath}[${i}]/td[1]/label/span/input`;
      const checkboxResult = document.evaluate(
        checkboxXpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const checkbox = checkboxResult.singleNodeValue;

      if (checkbox) {
        if (checkbox.checked) {
          checkbox.click();
          console.log(`取消勾选了第 ${i} 行`);
        } else {
          console.log(`第 ${i} 行未被勾选`);
        }
      } else {
        console.log(`未找到第 ${i} 行的checkbox`);
      }
    }

    console.log(`完成取消勾选，范围: ${start} - ${end}`);
  };

  // ============== 初始化 ==============
  createContainer();

  setTimeout(() => {
    createHelpPanel();
    setupKeyboardListener();
    console.log('快捷键选择助手已启动');
    showToast(`⌨️ ${projectConfig.name || '脚本'}已启动`, 2000);
  }, 1000);
})();
