// ==UserScript==
// @name         元素显示助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  根据xpath查找元素并在屏幕上显示副本
// @author       You
// @match        https://agi-eval.cn/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // 需要持续点击的下拉菜单xpath
  const CLICK_XPATH =
    '//*[@id="root"]/div/div/main/div/div/div[2]/div/div/div/div[1]/div/div[1]/div/span';

  // 需要监控的xpath列表
  const XPATHS = [
    '//*[@id="root"]/div/div/main/div/div/div[2]/div/div/div/div[1]/div/div[2]/div/div/div[2]/div/div[3]/div/div/div',
  ];

  // 添加样式
  GM_addStyle(`
        #tm-display-container {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 999999;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            background: #fff;
            border: 2px solid #1890ff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #tm-display-container .tm-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            margin-bottom: 10px;
            cursor: move;
        }

        #tm-display-container .tm-title {
            font-weight: bold;
            color: #1890ff;
            font-size: 14px;
        }

        #tm-display-container .tm-close {
            cursor: pointer;
            color: #999;
            font-size: 18px;
            line-height: 1;
        }

        #tm-display-container .tm-close:hover {
            color: #ff4d4f;
        }

        #tm-display-container .tm-content {
            padding: 5px 0;
        }

        #tm-display-container .tm-item {
            padding: 8px;
            margin-bottom: 8px;
            background: #f5f5f5;
            border-radius: 4px;
            border-left: 3px solid #1890ff;
        }

        #tm-display-container .tm-item:last-child {
            margin-bottom: 0;
        }

        #tm-display-container .tm-xpath-label {
            font-size: 10px;
            color: #999;
            margin-bottom: 5px;
            word-break: break-all;
        }

        #tm-display-container .tm-element-copy {
            background: #fff;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        #tm-display-container .tm-status {
            text-align: center;
            color: #999;
            padding: 20px;
        }

        #tm-display-container .tm-refresh {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #1890ff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        #tm-display-container .tm-refresh:hover {
            background: #40a9ff;
        }

        #tm-display-container .tm-minimize {
            cursor: pointer;
            color: #999;
            font-size: 16px;
            margin-right: 10px;
        }

        #tm-display-container .tm-minimize:hover {
            color: #1890ff;
        }

        #tm-display-container.minimized .tm-content,
        #tm-display-container.minimized .tm-refresh {
            display: none;
        }
    `);

  // 根据xpath获取元素
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

  // 点击下拉菜单
  let clickIntervalId = null;

  function clickDropdown() {
    const element = getElementByXPath(CLICK_XPATH);
    if (element) {
      element.click();
      console.log("已点击下拉菜单");
      return true;
    }
    return false;
  }

  // 停止持续点击
  function stopClicking() {
    if (clickIntervalId) {
      clearInterval(clickIntervalId);
      clickIntervalId = null;
      console.log("已停止持续点击");
    }
  }

  // 创建显示容器
  function createContainer() {
    const container = document.createElement("div");
    container.id = "tm-display-container";
    container.innerHTML = `
            <div class="tm-header">
                <span class="tm-title">📋 元素监控</span>
                <div>
                    <span class="tm-minimize" title="最小化">−</span>
                    <span class="tm-close" title="关闭">×</span>
                </div>
            </div>
            <div class="tm-content">
                <div class="tm-status">正在查找元素...</div>
            </div>
            <button class="tm-refresh">🔄 刷新</button>
        `;

    document.body.appendChild(container);

    // 关闭按钮
    container.querySelector(".tm-close").addEventListener("click", () => {
      container.remove();
    });

    // 最小化按钮
    container.querySelector(".tm-minimize").addEventListener("click", () => {
      container.classList.toggle("minimized");
    });

    // 刷新按钮
    container.querySelector(".tm-refresh").addEventListener("click", () => {
      updateContent();
    });

    // 拖拽功能
    makeDraggable(container);

    return container;
  }

  // 使容器可拖拽
  function makeDraggable(element) {
    const header = element.querySelector(".tm-header");
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener("mousedown", (e) => {
      if (
        e.target.classList.contains("tm-close") ||
        e.target.classList.contains("tm-minimize")
      ) {
        return;
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      element.style.left = startLeft + deltaX + "px";
      element.style.top = startTop + deltaY + "px";
      element.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  // 更新内容
  function updateContent() {
    const container = document.getElementById("tm-display-container");
    if (!container) return;

    const contentDiv = container.querySelector(".tm-content");
    let html = "";
    let foundCount = 0;

    XPATHS.forEach((xpath, index) => {
      const element = getElementByXPath(xpath);
      if (element) {
        foundCount++;
        // 克隆元素
        const clone = element.cloneNode(true);
        html += `
                    <div class="tm-item">
                        <div class="tm-xpath-label">XPath ${
                          index + 1
                        }: ${xpath.substring(0, 50)}...</div>
                        <div class="tm-element-copy">${clone.outerHTML}</div>
                    </div>
                `;
      }
    });

    if (foundCount === 0) {
      html =
        '<div class="tm-status">⚠️ 未找到匹配的元素<br><small>请确保页面已完全加载</small></div>';
    } else {
      // 找到内容后停止持续点击
      stopClicking();
    }

    contentDiv.innerHTML = html;
  }

  // 初始化
  function init() {
    // 等待页面加载完成
    if (document.readyState === "complete") {
      startMonitoring();
    } else {
      window.addEventListener("load", startMonitoring);
    }
  }

  function startMonitoring() {
    // 延迟一下，确保动态内容加载完成
    setTimeout(() => {
      createContainer();

      // 先点击一次下拉菜单
      clickDropdown();

      // 延迟后更新内容
      setTimeout(updateContent, 500);

      // 设置定时刷新（每3秒检查一次）
      setInterval(updateContent, 3000);

      // 持续点击下拉菜单（每2秒点击一次），找到内容后会自动停止
      clickIntervalId = setInterval(() => {
        clickDropdown();
      }, 2000);

      // 监听DOM变化（使用防抖避免卡顿）
      let debounceTimer;
      const observer = new MutationObserver((mutations) => {
        // 忽略我们自己容器内的变化
        const isOwnChange = mutations.every((mutation) => {
          const container = document.getElementById("tm-display-container");
          return container && container.contains(mutation.target);
        });

        if (!isOwnChange) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(updateContent, 300);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 1000);
  }

  init();
})();
