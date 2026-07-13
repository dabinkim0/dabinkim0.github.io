document.addEventListener("DOMContentLoaded", () => {
    const preventImageSaveGesture = (event) => {
        event.preventDefault();
    };
    const protectedProjectImages = document.querySelectorAll(".project-list .project-figure, .project-list .project-figure img");

    protectedProjectImages.forEach((element) => {
        element.addEventListener("contextmenu", preventImageSaveGesture);
        element.addEventListener("dragstart", preventImageSaveGesture);
    });

    document.querySelectorAll(".project-list .project-figure img").forEach((image) => {
        image.setAttribute("draggable", "false");
    });

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
    const overlayCloseButton = imageOverlay.querySelector(".image-overlay__close");
    const backgroundElements = Array.from(document.body.children).filter((element) => element !== imageOverlay);
    let closeTimer = null;
    let returnFocusTarget = null;

    const openOverlay = (src, alt) => {
        if (closeTimer) {
            window.clearTimeout(closeTimer);
            closeTimer = null;
        }

        returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        overlayImage.src = src;
        overlayImage.alt = alt;
        imageOverlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("has-image-overlay");
        backgroundElements.forEach((element) => element.setAttribute("inert", ""));

        window.requestAnimationFrame(() => {
            imageOverlay.classList.add("is-visible");
            overlayCloseButton.focus({ preventScroll: true });
        });
    };

    const closeOverlay = () => {
        imageOverlay.classList.remove("is-visible");
        document.body.classList.remove("has-image-overlay");
        imageOverlay.setAttribute("aria-hidden", "true");
        backgroundElements.forEach((element) => element.removeAttribute("inert"));

        if (returnFocusTarget?.isConnected) {
            returnFocusTarget.focus({ preventScroll: true });
        }
        returnFocusTarget = null;

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
        if (!imageOverlay.classList.contains("is-visible")) {
            return;
        }

        if (event.key === "Escape") {
            closeOverlay();
            return;
        }

        if (event.key === "Tab") {
            event.preventDefault();
            overlayCloseButton.focus();
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

    const projectList = document.querySelector("[data-project-list]");
    const viewButtons = Array.from(document.querySelectorAll("[data-project-view]"));

    if (projectList && viewButtons.length > 0) {
        const defaultProjectView = "grid-compact";
        const setProjectView = (view) => {
            const viewClasses = ["is-list", "is-grid", "is-grid-compact"];

            viewClasses.forEach((className) => {
                projectList.classList.remove(className);
            });

            projectList.classList.add(`is-${view}`);

            viewButtons.forEach((button) => {
                const isActive = button.dataset.projectView === view;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });
        };

        viewButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setProjectView(button.dataset.projectView);
            });
        });

        setProjectView(defaultProjectView);
    }

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

    const tagCounts = new Map();
    const tagOrder = new Map();

    entryData.forEach(({ tags: entryTags }) => {
        [...new Set(entryTags)].forEach((tag) => {
            if (!tagOrder.has(tag)) {
                tagOrder.set(tag, tagOrder.size);
            }

            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });

    const tags = [...tagCounts.keys()].sort((tagA, tagB) => {
        const countDiff = (tagCounts.get(tagB) || 0) - (tagCounts.get(tagA) || 0);
        return countDiff || tagOrder.get(tagA) - tagOrder.get(tagB);
    });
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
