document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const themeToggle = document.getElementById("themeToggle");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const searchInput = document.getElementById("searchInput");
  const clearSearch = document.getElementById("clearSearch");
  const reloadTabs = document.getElementById("reloadTabs");
  const createGroupBtn = document.getElementById("createGroup");
  const groupsList = document.getElementById("groupsList");
  const currentTabList = document.getElementById("currentTabList");
  const pinnedTabList = document.getElementById("pinnedTabList");

  // State
  let allTabs = [];
  let tabGroups = JSON.parse(localStorage.getItem("tabGroups") || "{}");
  let darkMode = localStorage.getItem("darkMode") === "true";

  // Initialize
  initTheme();
  loadTabs();
  renderGroups();

  // Event Listeners
  themeToggle.addEventListener("click", toggleTheme);
  tabButtons.forEach((btn) => btn.addEventListener("click", switchTab));
  searchInput.addEventListener("input", filterTabs);
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    filterTabs();
  });
  reloadTabs.addEventListener("click", () => {
    loadTabs();
  });
  createGroupBtn.addEventListener("click", createNewGroup);

  // Tab Events
  chrome.tabs.onCreated.addListener(loadTabs);
  chrome.tabs.onRemoved.addListener(loadTabs);
  chrome.tabs.onUpdated.addListener(loadTabs);
  chrome.tabGroups.onCreated.addListener(loadTabs);
  chrome.tabGroups.onRemoved.addListener(loadTabs);
  chrome.tabGroups.onUpdated.addListener(loadTabs);

  // Functions
  function initTheme() {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.remove("dark-mode");
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem("darkMode", darkMode);
    initTheme();
  }

  function switchTab(e) {
    const tabName = e.currentTarget.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabPanes.forEach((pane) => pane.classList.remove("active"));

    e.currentTarget.classList.add("active");
    document.getElementById(`${tabName}TabPane`).classList.add("active");

    if (tabName === "groups") {
      renderGroups();
    } else {
      filterTabs();
    }
  }

  function loadTabs() {
    chrome.tabs.query({}, (tabs) => {
      allTabs = tabs;
      filterTabs();
    });
  }

  function filterTabs() {
    const searchTerm = searchInput.value.toLowerCase();
    const activeTab = document.querySelector(".tab-button.active").dataset.tab;

    const filteredTabs = allTabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(searchTerm) ||
        tab.url.toLowerCase().includes(searchTerm)
    );

    if (activeTab === "current") {
      renderTabList(
        currentTabList,
        filteredTabs.filter((tab) => !tab.pinned)
      );
    } else if (activeTab === "pinned") {
      renderTabList(
        pinnedTabList,
        filteredTabs.filter((tab) => tab.pinned)
      );
    }
  }

  function renderTabList(container, tabs) {
    container.innerHTML = "";

    tabs.forEach((tab) => {
      const tabItem = document.createElement("div");
      tabItem.className = "tab-item";
      tabItem.innerHTML = `
        <img src="${
          tab.favIconUrl || "icons/logo.png"
        }" class="tab-favicon" alt="Favicon">
        <div class="tab-content-wrapper">
          <div class="tab-title">${tab.title}</div>
          <div class="tab-url">${tab.url}</div>
        </div>
        <div class="tab-actions">
          <button class="tab-action group" data-tab-id="${
            tab.id
          }" title="Add to group">
            <i class="fas fa-object-group"></i>
          </button>
          <button class="tab-action pin" data-tab-id="${tab.id}" title="${
        tab.pinned ? "Unpin" : "Pin"
      }">
            <i class="fas fa-thumbtack"></i>
          </button>
          <button class="tab-action reload" data-tab-id="${
            tab.id
          }" title="Reload">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="tab-action delete" data-tab-id="${
            tab.id
          }" title="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;

      container.appendChild(tabItem);

      // Add event listeners for actions
      tabItem.querySelectorAll(".tab-action").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const tabId = parseInt(btn.dataset.tabId);
          const action = btn.classList[1];

          switch (action) {
            case "group":
              showGroupOptions(tabId);
              break;
            case "pin":
              togglePinTab(tabId);
              break;
            case "reload":
              chrome.tabs.reload(tabId);
              break;
            case "delete":
              chrome.tabs.remove(tabId);
              break;
          }
        });
      });

      // Click to switch to tab
      tabItem.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      });
    });
  }

  function reloadAllTabs() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) chrome.tabs.reload(tab.id);
      });
    });
  }

  function renderGroups() {
    groupsList.innerHTML = "";

    chrome.storage.local.get(["tabGroups"], (result) => {
      tabGroups = result.tabGroups || {};

      Object.entries(tabGroups).forEach(([groupName, tabIds]) => {
        chrome.tabs.query({}, (allTabs) => {
          const groupTabs = allTabs.filter((tab) => tabIds.includes(tab.id));

          if (groupTabs.length > 0) {
            const groupItem = document.createElement("div");
            groupItem.className = "group-item";
            groupItem.innerHTML = `
            <div class="group-header">
              <div class="group-title">${groupName}</div>
              <div class="group-actions">
                <button class="group-action rename" data-group-name="${groupName}" title="Rename group">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="group-action delete" data-group-name="${groupName}" title="Delete group">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="group-tabs">
              ${groupTabs
                .map(
                  (tab) => `
                <div class="group-tab-item" data-tab-id="${tab.id}">
                  <img src="${
                    tab.favIconUrl || "./icons/icon16.png"
                  }" class="tab-favicon" alt="Favicon">
                  <div class="tab-content-wrapper">
                    <div class="tab-title">${tab.title}</div>
                    <div class="tab-url">${tab.url}</div>
                  </div>
                  <div class="tab-actions">
                    <button class="tab-action reload" data-tab-id="${
                      tab.id
                    }" title="Reload">
                      <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="tab-action delete" data-tab-id="${
                      tab.id
                    }" title="Remove from group">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          `;

            groupsList.appendChild(groupItem);

            // Toggle group expansion
            const groupHeader = groupItem.querySelector(".group-header");
            const groupTabs = groupItem.querySelector(".group-tabs");

            groupHeader.addEventListener("click", (e) => {
              // Chỉ toggle khi không click vào nút action
              if (!e.target.closest(".group-action")) {
                groupTabs.classList.toggle("expanded");
              }
            });

            // Xử lý rename group
            groupItem
              .querySelector(".group-action.rename")
              .addEventListener("click", (e) => {
                e.stopPropagation();
                const oldGroupName = e.currentTarget.dataset.groupName;
                const newGroupName = prompt(
                  "Enter new group name:",
                  oldGroupName
                );

                if (newGroupName && newGroupName !== oldGroupName) {
                  // Tạo group mới với tên mới
                  tabGroups[newGroupName] = [...tabGroups[oldGroupName]];
                  // Xóa group cũ
                  delete tabGroups[oldGroupName];

                  chrome.storage.local.set({ tabGroups }, () => {
                    renderGroups();
                  });
                }
              });

            // Xử lý delete group
            groupItem
              .querySelector(".group-action.delete")
              .addEventListener("click", (e) => {
                e.stopPropagation();
                const groupName = e.currentTarget.dataset.groupName;

                if (
                  confirm(
                    `Are you sure you want to delete group "${groupName}"?`
                  )
                ) {
                  delete tabGroups[groupName];
                  chrome.storage.local.set({ tabGroups }, () => {
                    renderGroups();
                  });
                }
              });

            // Tab actions trong group
            groupItem.querySelectorAll(".tab-action").forEach((btn) => {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const tabId = parseInt(btn.dataset.tabId);

                if (btn.classList.contains("reload")) {
                  chrome.tabs.reload(tabId);
                } else if (btn.classList.contains("delete")) {
                  const groupName = btn
                    .closest(".group-item")
                    .querySelector(".group-title").textContent;
                  tabGroups[groupName] = tabGroups[groupName].filter(
                    (id) => id !== tabId
                  );

                  // Nếu group trống thì xóa luôn
                  if (tabGroups[groupName].length === 0) {
                    delete tabGroups[groupName];
                  }

                  chrome.storage.local.set({ tabGroups }, () => {
                    renderGroups();
                  });
                }
              });
            });
          }
        });
      });
    });
  }

  function createNewGroup() {
    chrome.tabs.query({ currentWindow: true, highlighted: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.group({ tabIds: tabs.map((tab) => tab.id) }, (groupId) => {
          chrome.tabGroups.update(groupId, {
            title: "New Group",
            collapsed: false,
          });
          renderGroups();
        });
      } else {
        alert("Please select tabs first by highlighting them");
      }
    });
  }

  function showGroupOptions(tabId) {
    // Simple implementation - you can enhance this with a modal
    chrome.tabGroups.query({}, (groups) => {
      const groupNames = groups.map((g) => g.title || "Untitled Group");

      if (groupNames.length > 0) {
        const groupName = prompt(
          `Add to which group?\nExisting groups: ${groupNames.join(
            ", "
          )}\n\nEnter new group name to create`,
          "New Group"
        );

        if (groupName) {
          chrome.tabs.get(tabId, (tab) => {
            // Find existing group or create new
            const existingGroup = groups.find((g) => g.title === groupName);

            if (existingGroup) {
              chrome.tabs.group({ tabIds: tab.id, groupId: existingGroup.id });
            } else {
              chrome.tabs.group({ tabIds: tab.id }, (groupId) => {
                chrome.tabGroups.update(groupId, {
                  title: groupName,
                  collapsed: false,
                });
              });
            }
          });
        }
      } else {
        const groupName = prompt("Enter name for new group:", "New Group");
        if (groupName) {
          chrome.tabs.get(tabId, (tab) => {
            chrome.tabs.group({ tabIds: tab.id }, (groupId) => {
              chrome.tabGroups.update(groupId, {
                title: groupName,
                collapsed: false,
              });
            });
          });
        }
      }
    });
  }

  function togglePinTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
      chrome.tabs.update(tabId, { pinned: !tab.pinned });
    });
  }
});
