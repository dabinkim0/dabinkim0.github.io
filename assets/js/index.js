document.addEventListener("DOMContentLoaded", () => {
    const newsSection = document.querySelector(".education-list");
    if (!newsSection) {
        return;
    }

    const toggleButton = newsSection.querySelector(".news-toggle");
    if (!toggleButton) {
        return;
    }

    toggleButton.addEventListener("click", () => {
        const isCollapsed = newsSection.classList.toggle("is-collapsed");
        toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
    });
});
