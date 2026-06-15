const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));

function showPanel(id) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.target === id);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === id);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showPanel(tab.dataset.target));
});
