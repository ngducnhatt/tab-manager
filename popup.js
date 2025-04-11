document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("openSidePanel")
    .addEventListener("click", async () => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.windowId) {
        await chrome.sidePanel.open({ windowId: tabs[0].windowId });
        window.close();
      }
    });
});
