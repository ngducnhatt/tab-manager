document.getElementById("openSidePanelBtn").addEventListener("click", () => {
  // Sử dụng Chrome API để mở side panel
  if (chrome.sidePanel) {
    chrome.windows.getCurrent((currentWindow) => {
      if (currentWindow && currentWindow.id) {
        chrome.sidePanel.open({ windowId: currentWindow.id }, () => {
          // Optional callback after opening Side Panel
          // Tự động đóng popup ngay sau khi yêu cầu mở side panel
          window.close();
        });
      } else {
        console.error("Could not get current window ID.");
        alert("Lỗi: Không thể xác định cửa sổ hiện tại để mở Side Panel.");
        // Vẫn đóng popup ngay cả khi có lỗi lấy window ID
        window.close();
      }
    });
  } else {
    console.error("Side Panel API not available. Please update Chrome.");
    alert("Side Panel không khả dụng. Vui lòng cập nhật trình duyệt Chrome.");
    // Vẫn đóng popup
    window.close();
  }
});
