(function () {
  "use strict";

  var scriptEl = document.currentScript;
  var workspaceId = scriptEl?.getAttribute("data-workspace") || "";
  var channel = scriptEl?.getAttribute("data-channel") || "widget";
  var API_BASE =
    (scriptEl?.getAttribute("data-api-url") || window.location.origin) +
    "/api/trpc";
  var CONV_KEY = "sopranova_conv_" + workspaceId;

  if (!workspaceId) {
    console.warn("[sopranova-chat] data-workspace is missing");
    return;
  }

  var conversationId = sessionStorage.getItem(CONV_KEY) || undefined;

  // --- Inject styles ---
  var style = document.createElement("style");
  style.textContent =
    ".sn-chat-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#111;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-size:24px;transition:transform .2s}.sn-chat-bubble:hover{transform:scale(1.08)}.sn-chat-panel{position:fixed;bottom:96px;right:24px;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:2147483647;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}.sn-chat-panel[data-open="false"]{display:none}.sn-chat-header{background:#111;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}.sn-chat-header span{font-weight:600;font-size:15px}.sn-chat-close{background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1;padding:0 4px}.sn-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.sn-chat-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.45;word-wrap:break-word}.sn-chat-msg--user{align-self:flex-end;background:#111;color:#fff;border-bottom-right-radius:4px}.sn-chat-msg--bot{align-self:flex-start;background:#f1f1f1;color:#111;border-bottom-left-radius:4px}.sn-chat-msg--error{align-self:center;background:#fee;color:#b00;font-size:12px;padding:6px 10px}.sn-chat-typing{align-self:flex-start;background:#f1f1f1;color:#888;border-bottom-left-radius:4px;padding:10px 14px;font-size:13px;display:none}.sn-chat-typing[data-show="true"]{display:block}.sn-chat-typing span{animation:sn-dot-pulse 1.2s infinite;display:inline-block;width:6px;height:6px;background:#888;border-radius:50%;margin:0 2px}.sn-chat-typing span:nth-child(2){animation-delay:.2s}.sn-chat-typing span:nth-child(3){animation-delay:.4s}@keyframes sn-dot-pulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}.sn-chat-input-area{border-top:1px solid #eee;padding:10px;display:flex;gap:8px;flex-shrink:0;background:#fff}.sn-chat-input{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;resize:none;font-family:inherit}.sn-chat-input:focus{border-color:#111}.sn-chat-send{background:#111;color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:500;flex-shrink:0}.sn-chat-send:disabled{opacity:.4;cursor:not-allowed}";
  document.head.appendChild(style);

  // --- Build DOM ---
  var bubble = document.createElement("button");
  bubble.className = "sn-chat-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.textContent = "\u{1F4AC}";

  var panel = document.createElement("div");
  panel.className = "sn-chat-panel";
  panel.setAttribute("data-open", "false");

  var header = document.createElement("div");
  header.className = "sn-chat-header";
  var headerTitle = document.createElement("span");
  headerTitle.textContent = "Chat with us";
  var closeBtn = document.createElement("button");
  closeBtn.className = "sn-chat-close";
  closeBtn.setAttribute("aria-label", "Close chat");
  closeBtn.textContent = "\u00D7";
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);

  var messages = document.createElement("div");
  messages.className = "sn-chat-messages";

  var typing = document.createElement("div");
  typing.className = "sn-chat-typing";
  typing.setAttribute("data-show", "false");
  typing.innerHTML =
    '<span></span><span></span><span></span>';

  var inputArea = document.createElement("div");
  inputArea.className = "sn-chat-input-area";
  var input = document.createElement("input");
  input.className = "sn-chat-input";
  input.type = "text";
  input.placeholder = "Type a message\u2026";
  var sendBtn = document.createElement("button");
  sendBtn.className = "sn-chat-send";
  sendBtn.textContent = "Send";
  sendBtn.disabled = true;
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(typing);
  panel.appendChild(inputArea);

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  // --- Helpers ---
  function addMessage(text, role) {
    var div = document.createElement("div");
    div.className = "sn-chat-msg sn-chat-msg--" + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function setTyping(show) {
    typing.setAttribute("data-show", show ? "true" : "false");
    messages.scrollTop = messages.scrollHeight;
  }

  function setLoading(loading) {
    sendBtn.disabled = loading;
    input.disabled = loading;
  }

  // --- Open / Close ---
  function openPanel() {
    panel.setAttribute("data-open", "true");
    bubble.setAttribute("aria-label", "Close chat");
    bubble.textContent = "\u00D7";
    input.focus();
  }
  function closePanel() {
    panel.setAttribute("data-open", "false");
    bubble.setAttribute("aria-label", "Open chat");
    bubble.textContent = "\u{1F4AC}";
  }
  function togglePanel() {
    panel.getAttribute("data-open") === "true" ? closePanel() : openPanel();
  }

  bubble.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", closePanel);

  // --- Send message ---
  async function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    setLoading(true);
    setTyping(true);

    try {
      var body = {
        json: {
          workspaceId: Number(workspaceId),
          message: text,
          conversationId: conversationId || undefined,
        },
      };

      var res = await fetch(API_BASE + "/intelligence.ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      var data = await res.json();

      // tRPC wraps result in result.data.json
      var result = data?.result?.data?.json || data?.result?.data;
      if (result?.reply) {
        addMessage(result.reply, "bot");
      }
      if (result?.conversationId) {
        conversationId = result.conversationId;
        sessionStorage.setItem(CONV_KEY, conversationId);
      }
    } catch (err) {
      console.error("[sopranova-chat]", err);
      addMessage("Something went wrong. Please try again.", "error");
    } finally {
      setTyping(false);
      setLoading(false);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", function () {
    sendBtn.disabled = input.value.trim().length === 0;
  });
})();
