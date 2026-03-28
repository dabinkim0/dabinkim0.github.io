document.addEventListener("DOMContentLoaded", () => {
    const filterPanel = document.querySelector("[data-project-filter-panel]");
    const filterList = document.querySelector("[data-project-filter-list]");
    const filterStatus = document.querySelector("[data-project-filter-status]");
    const entries = Array.from(document.querySelectorAll(".project-entry"));

    if (!filterPanel || !filterList || entries.length === 0) {
        return;
    }

    const entryData = entries.map((entry) => {
        const tags = Array.from(entry.querySelectorAll(".format-tag"))
            .map((button) => button.dataset.filterTag?.trim())
            .filter(Boolean);

        return { entry, tags };
    });

    const tags = [...new Set(entryData.flatMap(({ tags: entryTags }) => entryTags))];
    let activeTag = null;
    const topLevelButtons = new Map();

    const setButtonState = (button, isActive) => {
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    };

    const updateStatus = () => {
        if (!filterStatus) {
            return;
        }

        if (!activeTag) {
            filterStatus.textContent = `Showing all ${entries.length} projects.`;
            return;
        }

        const visibleCount = entryData.filter(({ tags: entryTags }) => entryTags.includes(activeTag)).length;
        const noun = visibleCount === 1 ? "project" : "projects";
        filterStatus.textContent = `Showing ${visibleCount} ${noun} tagged "${activeTag}".`;
    };

    const applyFilter = (tag) => {
        activeTag = tag;
        setButtonState(allButton, !activeTag);

        topLevelButtons.forEach((button, buttonTag) => {
            setButtonState(button, buttonTag === activeTag);
        });

        entryData.forEach(({ entry, tags: entryTags }) => {
            const matches = !activeTag || entryTags.includes(activeTag);
            entry.hidden = !matches;

            entry.querySelectorAll(".format-tag").forEach((button) => {
                setButtonState(button, button.dataset.filterTag === activeTag);
            });
        });

        updateStatus();
    };

    const handleFilterClick = (tag) => {
        applyFilter(activeTag === tag ? null : tag);
    };

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "project-filter-chip is-active";
    allButton.textContent = "All";
    allButton.addEventListener("click", () => applyFilter(null));
    filterList.append(allButton);

    tags.forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "project-filter-chip";
        button.textContent = tag;
        button.dataset.filterTag = tag;
        button.addEventListener("click", () => handleFilterClick(tag));
        topLevelButtons.set(tag, button);
        filterList.append(button);
    });

    entries.forEach((entry) => {
        entry.querySelectorAll(".format-tag").forEach((button) => {
            const tag = button.dataset.filterTag?.trim();
            if (!tag) {
                return;
            }

            button.addEventListener("click", () => handleFilterClick(tag));
        });
    });

    applyFilter(null);
});
