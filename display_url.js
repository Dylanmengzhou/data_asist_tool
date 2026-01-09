// ==UserScript==
// @name         AGI Eval：URL 文本转可点击链接（稳）
// @namespace    http://tampermonkey.net/
// @version      0.6
// @match        https://agi-eval.cn/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const XPATH =
    '//*[@id="root"]/div/div/div/main/div[2]/div[1]/div/div[1]/form/div/div[3]/div/div/div/div[3]/div[2]/div/div[2]/div/div/div';
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

  function linkify() {
    const el = getNodeByXPath(XPATH);
    if (!el) {
      console.log("[TM] 未找到目标元素");
      return false;
    }

    // 已处理过就跳过（避免 observer/轮询反复改）
    if (el.getAttribute(MARK) === "1") {
      console.log("[TM] 元素已处理过，跳过");
      return true;
    }

    const text = (el.textContent || "").trim();
    console.log("[TM] 找到元素，文本内容:", text);

    if (!text) {
      console.log("[TM] 文本为空");
      return false;
    }

    // 用正则提取URL
    const url = extractUrl(text);
    console.log("[TM] 提取的URL:", url);

    if (!url) {
      console.log("[TM] 未匹配到URL");
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

    // 不用 innerHTML 清空（React 更容易重绘覆盖）
    // 改成替换子节点更温和一些
    el.textContent = "";
    el.appendChild(a);
    el.setAttribute(MARK, "1");

    console.log("[TM] linkified 成功:", url);
    return true;
  }

  // 1) 先立刻尝试一次（解决“元素已经渲染好了但 observer 没触发”的情况）
  if (linkify()) return;

  // 2) 监听 #root（React 内容都在这下面变化）
  const root = document.querySelector("#root") || document.documentElement;

  const obs = new MutationObserver(() => {
    linkify();
  });
  obs.observe(root, { childList: true, subtree: true });

  // 3) 轮询兜底（有些渲染不一定触发你能捕获的 mutation）
  const start = Date.now();
  const timer = setInterval(() => {
    if (linkify()) {
      clearInterval(timer);
      // observer 也可以不断开，让它在 React 重绘后还能再补一次
      // 如果你只想处理一次就断开：obs.disconnect();
      return;
    }
    if (Date.now() - start > 20000) {
      // 20 秒超时
      clearInterval(timer);
      console.log("[TM] timeout: not found or not a url yet");
    }
  }, 300);
})();
