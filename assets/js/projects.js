document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlayDuration = prefersReducedMotion ? 0 : 220;
    const imageOverlay = document.createElement("div");
    imageOverlay.className = "image-overlay";
    imageOverlay.setAttribute("aria-hidden", "true");
    imageOverlay.innerHTML = `
        <div class="image-overlay__backdrop" data-image-close></div>
        <div class="image-overlay__dialog" role="dialog" aria-modal="true" aria-label="Project poster preview">
            <button class="image-overlay__close" type="button" data-image-close aria-label="Close image preview">X</button>
            <div class="image-overlay__viewport">
                <img class="image-overlay__image" alt="">
            </div>
        </div>
    `;
    document.body.append(imageOverlay);

    const overlayImage = imageOverlay.querySelector(".image-overlay__image");
    let closeTimer = null;

    const openOverlay = (src, alt) => {
        if (closeTimer) {
            window.clearTimeout(closeTimer);
            closeTimer = null;
        }

        overlayImage.src = src;
        overlayImage.alt = alt;
        imageOverlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("has-image-overlay");

        window.requestAnimationFrame(() => {
            imageOverlay.classList.add("is-visible");
        });
    };

    const closeOverlay = () => {
        imageOverlay.classList.remove("is-visible");
        document.body.classList.remove("has-image-overlay");
        imageOverlay.setAttribute("aria-hidden", "true");

        closeTimer = window.setTimeout(() => {
            overlayImage.src = "";
            overlayImage.alt = "";
            closeTimer = null;
        }, overlayDuration);
    };

    imageOverlay.querySelectorAll("[data-image-close]").forEach((button) => {
        button.addEventListener("click", closeOverlay);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && imageOverlay.classList.contains("is-visible")) {
            closeOverlay();
        }
    });

    document.querySelectorAll("[data-popup-image]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            openOverlay(
                link.href,
                link.getAttribute("aria-label") || "Project image preview"
            );
        });
    });

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
