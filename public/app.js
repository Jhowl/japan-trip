const ownerKey = "japanTripOwner";

const ownerDisplay = document.querySelector("[data-owner-display]");
const ownerInputs = document.querySelectorAll("input.owner-input");
const modal = document.querySelector("[data-owner-modal]");
const saveButton = document.querySelector("[data-owner-save]");
const ownerRadios = document.querySelectorAll("input[name='owner-choice']");
const changeButton = document.querySelector("[data-owner-change]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeKey = "japanTripTheme";

const setOwner = (value) => {
  localStorage.setItem(ownerKey, value);
  if (ownerDisplay) {
    ownerDisplay.textContent = value;
  }
  ownerInputs.forEach((input) => {
    input.value = value;
  });
};

const openModal = () => {
  if (modal) modal.classList.remove("hidden");
};

const closeModal = () => {
  if (modal) modal.classList.add("hidden");
};

const getSelectedOwner = () => {
  const selected = Array.from(ownerRadios).find((radio) => radio.checked);
  return selected ? selected.value : "Ellie";
};

const initOwner = () => {
  const savedOwner = localStorage.getItem(ownerKey);
  if (savedOwner) {
    setOwner(savedOwner);
  } else {
    openModal();
  }

  ownerRadios.forEach((radio) => {
    if (radio.value === savedOwner) {
      radio.checked = true;
    }
  });
};

const setTheme = (mode) => {
  const isDark = mode === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  localStorage.setItem(themeKey, mode);
  if (themeLabel) {
    themeLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
  }
};

const initTheme = () => {
  const savedTheme = localStorage.getItem(themeKey) || "light";
  setTheme(savedTheme);
};

const closeEditModal = (modalEl) => {
  if (modalEl) modalEl.classList.add("hidden");
};

const openEditModal = (modalEl) => {
  if (modalEl) modalEl.classList.remove("hidden");
};

const attachEditHandlers = () => {
  const postModal = document.querySelector("[data-edit-modal='post']");
  const taskModal = document.querySelector("[data-edit-modal='task']");
  const itemModal = document.querySelector("[data-edit-modal='item']");
  const itineraryModal = document.querySelector("[data-edit-modal='itinerary']");

  document.querySelectorAll("[data-edit-post]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!postModal) return;
      const { postId, postKind, postTitle, postUrl, postContent } = button.dataset;
      const form = postModal.querySelector("form");
      form.action = `/posts/${postId}/edit`;
      form.querySelector("[name='kind']").value = postKind || "note";
      form.querySelector("[name='title']").value = postTitle || "";
      form.querySelector("[name='url']").value = postUrl || "";
      form.querySelector("[name='content']").value = postContent || "";
      openEditModal(postModal);
    });
  });

  document.querySelectorAll("[data-edit-task]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!taskModal) return;
      const { taskId, taskCategory, taskText } = button.dataset;
      const form = taskModal.querySelector("form");
      form.action = `/tasks/${taskId}/edit`;
      form.querySelector("[name='category']").value = taskCategory || "before";
      form.querySelector("[name='text']").value = taskText || "";
      openEditModal(taskModal);
    });
  });

  document.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!itemModal) return;
      const { itemId, itemList, itemName } = button.dataset;
      const form = itemModal.querySelector("form");
      form.action = `/items/${itemId}/edit`;
      form.querySelector("[name='list']").value = itemList || "before-travel";
      form.querySelector("[name='name']").value = itemName || "";
      openEditModal(itemModal);
    });
  });

  document.querySelectorAll("[data-edit-itinerary]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!itineraryModal) return;
      const { itineraryId, itineraryDate, itineraryDescription } = button.dataset;
      const form = itineraryModal.querySelector("form");
      form.action = `/itinerary/${itineraryId}/edit`;
      form.querySelector("[name='date']").value = itineraryDate || "";
      form.querySelector("[name='description']").value = itineraryDescription || "";
      openEditModal(itineraryModal);
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalEl = button.closest(".modal-backdrop");
      closeEditModal(modalEl);
    });
  });
};

if (saveButton) {
  saveButton.addEventListener("click", () => {
    const selected = getSelectedOwner();
    setOwner(selected);
    closeModal();
  });
}

if (changeButton) {
  changeButton.addEventListener("click", () => {
    openModal();
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("theme-dark");
    setTheme(isDark ? "light" : "dark");
  });
}

window.addEventListener("load", () => {
  initOwner();
  initTheme();
  attachEditHandlers();
});
