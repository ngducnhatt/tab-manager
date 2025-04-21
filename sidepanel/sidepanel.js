document.addEventListener("DOMContentLoaded", () => {
  const tabListElement = document.getElementById("tabList");
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const darkModeToggleBtn = document.getElementById("darkModeToggle");

  let currentFilter = "all";
  let currentSearchQuery = "";
  let isDarkMode = false;

  // --- Helper function: Debounce ---
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  // Debounced version of listTabs
  const debouncedListTabs = debounce(listTabs, 100);

  // --- Dark Mode Functions ---
  function applyDarkMode(enabled) {
    isDarkMode = enabled;
    if (enabled) {
      document.body.classList.add("dark-mode");
      darkModeToggleBtn.querySelector("i").classList.remove("fa-moon");
      darkModeToggleBtn.querySelector("i").classList.add("fa-sun");
    } else {
      document.body.classList.remove("dark-mode");
      darkModeToggleBtn.querySelector("i").classList.remove("fa-sun");
      darkModeToggleBtn.querySelector("i").classList.add("fa-moon");
    }
  }

  function saveDarkModePreference() {
    chrome.storage.local.set({ darkMode: isDarkMode }, (result) => {
      // Check chrome.runtime.lastError inside the callback
      if (chrome.runtime.lastError) {
        console.error(
          "Error saving dark mode preference:",
          chrome.runtime.lastError
        );
      } else {
        console.log("Dark mode preference saved:", isDarkMode);
      }
    });
  }

  function loadDarkModePreference() {
    chrome.storage.local.get("darkMode", (result) => {
      // Check chrome.runtime.lastError inside the callback
      if (chrome.runtime.lastError) {
        console.error(
          "Error loading dark mode preference:",
          chrome.runtime.lastError
        );
        // Mặc định là sáng nếu lỗi
        applyDarkMode(false);
        return;
      }
      const savedPreference =
        result.darkMode !== undefined ? result.darkMode : false;
      applyDarkMode(savedPreference);
    });
  }

  // --- Event Listeners ---

  tabListElement.addEventListener("click", (event) => {
    const target = event.target;
    const actionButton = target.closest(".action-btn");
    if (!actionButton) return;

    const listItem = actionButton.closest("li");
    const tabId = parseInt(listItem.dataset.tabId);
    if (isNaN(tabId)) {
      console.error("Invalid tab ID from list item:", listItem.dataset.tabId);
      return;
    }

    const action = actionButton.dataset.action;

    switch (action) {
      case "pin":
        togglePin(tabId, actionButton);
        break;
      case "star":
        bookmarkTab(tabId);
        break;
      case "close":
        closeTab(tabId);
        break;
    }
  });

  searchInput.addEventListener("input", (event) => {
    currentSearchQuery = event.target.value.toLowerCase();
    debouncedListTabs();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      currentFilter = event.target.dataset.filter;

      filterButtons.forEach((btn) => btn.classList.remove("active"));
      event.target.classList.add("active");

      debouncedListTabs();
    });
  });

  darkModeToggleBtn.addEventListener("click", () => {
    applyDarkMode(!isDarkMode);
    saveDarkModePreference();
  });

  // --- Main function: List and Filter Tabs ---
  function listTabs() {
    console.log("listTabs: Bắt đầu..."); // Log bắt đầu
    tabListElement.innerHTML = ""; // Clear current list

    chrome.tabs.query({}, (tabs) => {
      console.log("listTabs: Đã truy vấn tabs. Số lượng:", tabs.length); // Log số lượng tab

      // --- Sử dụng try...catch để bắt lỗi trong quá trình xử lý và render ---
      try {
        if (chrome.runtime.lastError) {
          console.error(
            "listTabs: Lỗi truy vấn tabs:",
            chrome.runtime.lastError
          ); // Log lỗi truy vấn
          tabListElement.innerHTML = "<li>Lỗi khi tải danh sách tab.</li>";
          return;
        }

        if (tabs.length === 0) {
          console.log("listTabs: Không có tab nào."); // Log không có tab
          tabListElement.innerHTML = "<li>Không tìm thấy tab nào đang mở.</li>";
          return;
        }

        // --- Filtering ---
        let filteredTabs = tabs.filter((tab) => {
          if (currentFilter === "pinned" && !tab.pinned) {
            return false;
          }
          if (currentSearchQuery) {
            const searchQuery = currentSearchQuery;
            const tabTitle = tab.title ? tab.title.toLowerCase() : "";
            const tabUrl = tab.url ? tab.url.toLowerCase() : "";

            if (
              !tabTitle.includes(searchQuery) &&
              !tabUrl.includes(searchQuery)
            ) {
              return false;
            }
          }
          return true;
        });

        console.log(
          "listTabs: Đã lọc tabs. Số lượng còn lại:",
          filteredTabs.length
        ); // Log sau khi lọc

        // --- Sorting ---
        filteredTabs.sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return b.pinned - a.pinned;
          }
          if (a.windowId !== b.windowId) {
            return a.windowId - b.windowId;
          }
          return a.index - b.index;
        });

        console.log("listTabs: Đã sắp xếp tabs."); // Log sau khi sắp xếp

        // --- Rendering ---
        if (filteredTabs.length === 0) {
          console.log("listTabs: Không có tab nào phù hợp với bộ lọc."); // Log không có tab sau lọc
          tabListElement.innerHTML =
            "<li>Không tìm thấy tab nào phù hợp với bộ lọc.</li>";
          return;
        }

        console.log("listTabs: Bắt đầu rendering..."); // Log bắt đầu render

        filteredTabs.forEach((tab) => {
          // console.log("listTabs: Rendering tab:", tab.id, "-", tab.title); // Log từng tab

          const listItem = document.createElement("li");
          listItem.dataset.tabId = tab.id;

          // --- Favicon ---
          const faviconImg = document.createElement("img");
          faviconImg.classList.add("tab-favicon");
          faviconImg.src = tab.favIconUrl ? tab.favIconUrl : "/images/logo.png";
          faviconImg.alt = "Favicon";
          faviconImg.onerror = () => {
            faviconImg.src = "/images/logo.png";
          };
          listItem.appendChild(faviconImg);

          // Phần tử link/tên tab
          const link = document.createElement("a");
          link.href = tab.url || "#";
          link.textContent = tab.title || "Tab không có tiêu đề";
          link.classList.add("tab-title");
          if (tab.pinned) {
            link.classList.add("pinned");
          }
          link.addEventListener("click", (event) => {
            event.preventDefault();
            if (tab.id) {
              chrome.tabs.update(tab.id, { active: true });
            }
          });
          listItem.appendChild(link);

          // Container cho các nút thao tác
          const actionsContainer = document.createElement("div");
          actionsContainer.classList.add("tab-actions");

          // Nút Ghim/Bỏ ghim (Sử dụng icon Font Awesome)
          const pinBtn = document.createElement("button");
          pinBtn.classList.add("action-btn", "pin");
          pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>'; // Icon
          if (tab.pinned) {
            pinBtn.classList.add("is-pinned");
          } // Class cho màu khi ghim
          pinBtn.dataset.tabId = tab.id;
          pinBtn.dataset.action = "pin";
          pinBtn.title = tab.pinned ? "Bỏ ghim tab" : "Ghim tab";

          // Nút Đánh dấu sao (Bookmark) (Sử dụng icon Font Awesome)
          const starBtn = document.createElement("button");
          starBtn.classList.add("action-btn", "star");
          starBtn.innerHTML = '<i class="fas fa-star"></i>'; // Icon
          starBtn.dataset.tabId = tab.id;
          starBtn.dataset.action = "star";
          starBtn.title = "Đánh dấu sao (Bookmark) tab này";

          // Nút Đóng Tab (Sử dụng icon Font Awesome)
          const closeBtn = document.createElement("button");
          closeBtn.classList.add("action-btn", "close");
          closeBtn.innerHTML = '<i class="fas fa-times"></i>'; // Icon
          closeBtn.dataset.tabId = tab.id;
          closeBtn.dataset.action = "close";
          closeBtn.title = "Đóng tab";

          actionsContainer.appendChild(pinBtn);
          actionsContainer.appendChild(starBtn);
          actionsContainer.appendChild(closeBtn);

          listItem.appendChild(actionsContainer);

          tabListElement.appendChild(listItem);
        });

        console.log("listTabs: Rendering hoàn tất."); // Log hoàn tất rendering
      } catch (e) {
        // Bắt bất kỳ lỗi nào xảy ra trong khối try
        console.error("listTabs: Lỗi trong quá trình xử lý hoặc rendering:", e); // Log lỗi chi tiết
        tabListElement.innerHTML =
          "<li>Đã xảy ra lỗi khi hiển thị tab. Vui lòng kiểm tra Console.</li>";
      }
    });
    console.log("listTabs: Yêu cầu chrome.tabs.query đã gửi."); // Log sau khi gọi query
  }

  // --- Functions for button actions (Keep these) ---

  function togglePin(tabId, buttonElement) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting tab for pin:", chrome.runtime.lastError);
        return;
      }
      if (tab) {
        const newState = !tab.pinned;
        chrome.tabs.update(tabId, { pinned: newState }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error pinning/unpinning tab:",
              chrome.runtime.lastError
            );
            alert("Lỗi khi ghim/bỏ ghim tab.");
          } else {
            console.log(`Tab ${tabId} pinned state set to ${newState}`);
            debouncedListTabs(); // Re-list to update sorting/icon color
          }
        });
      }
    });
  }

  function bookmarkTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error getting tab for bookmark:",
          chrome.runtime.lastError
        );
        alert(
          "Không thể đánh dấu sao tab này. Lỗi: " +
            chrome.runtime.lastError.message
        );
        return;
      }
      if (
        tab &&
        tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("chrome-extension://")
      ) {
        chrome.bookmarks.create(
          { url: tab.url, title: tab.title || "Tab không có tiêu đề" },
          (newBookmark) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error creating bookmark:",
                chrome.runtime.lastError
              );
              alert(
                "Lỗi khi tạo bookmark: " + chrome.runtime.lastError.message
              );
            } else {
              console.log("Bookmark created:", newBookmark);
              alert(
                `Đã thêm "${tab.title || "Tab không có tiêu đề"}" vào Bookmark.`
              );
            }
          }
        );
      } else {
        alert(
          "Không thể đánh dấu sao tab này vì nó không có URL hợp lệ hoặc là trang nội bộ."
        );
      }
    });
  }

  function closeTab(tabId) {
    chrome.tabs.remove(tabId, () => {
      if (chrome.runtime.lastError) {
        console.error("Error closing tab:", chrome.runtime.lastError);
        alert("Lỗi khi đóng tab: " + chrome.runtime.lastError.message);
      } else {
        console.log(`Tab ${tabId} closed.`);
        debouncedListTabs();
      }
    });
  }

  // --- Initialize and Listeners for Tab Events ---

  loadDarkModePreference(); // Tải trạng thái dark mode khi Side Panel mở

  // Yêu cầu chrome.tabs.query chạy lần đầu tiên khi DOMContentLoaded
  // Không dùng debounced cho lần gọi đầu này
  listTabs();

  // Listeners for tab events, calling the debounced function
  chrome.tabs.onCreated.addListener(debouncedListTabs);
  chrome.tabs.onRemoved.addListener(debouncedListTabs);
  chrome.tabs.onUpdated.addListener(debouncedListTabs);
  chrome.tabs.onActivated.addListener(debouncedListTabs);
  chrome.tabs.onPinned.addListener(debouncedListTabs);
});
