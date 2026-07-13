document.addEventListener("DOMContentLoaded", () => {
    const syncPublicationTitleDemoLinks = () => {
        document.querySelectorAll("#publications .item-list li").forEach((item) => {
            const titleLink = item.querySelector("h3 a");
            const demoLink = Array.from(item.querySelectorAll(".links a")).find((link) => {
                const href = link.getAttribute("href")?.trim();
                const isDemoLink = link.textContent.trim().toLowerCase() === "demo";
                const isDisabled = link.classList.contains("disabled-link") || link.getAttribute("aria-disabled") === "true";
                return isDemoLink && href && href !== "#" && !isDisabled;
            });

            if (!titleLink || !demoLink) {
                return;
            }

            const titleHref = titleLink.getAttribute("href")?.trim();
            const isPlaceholderTitle = !titleHref || titleHref === "#" || titleLink.classList.contains("disabled-link") || titleLink.getAttribute("aria-disabled") === "true";

            if (!isPlaceholderTitle) {
                return;
            }

            titleLink.setAttribute("href", demoLink.getAttribute("href"));
            titleLink.classList.remove("disabled-link");
            titleLink.removeAttribute("aria-disabled");
            titleLink.removeAttribute("tabindex");

            if (demoLink.hasAttribute("target")) {
                titleLink.setAttribute("target", demoLink.getAttribute("target"));
            }

            if (demoLink.hasAttribute("rel")) {
                titleLink.setAttribute("rel", demoLink.getAttribute("rel"));
            }
        });
    };

    syncPublicationTitleDemoLinks();

    const collapsibleSections = document.querySelectorAll("[data-collapsible]");
    const getClosestElement = (target, selector) => {
        const element = target instanceof Element ? target : target?.parentElement;
        return element?.closest(selector) || null;
    };
    const syncDraggableState = (area) => {
        const isCollapsed = Boolean(area.closest(".is-collapsed"));
        const canScroll = !isCollapsed && area.scrollHeight > area.clientHeight + 4;
        area.classList.toggle("is-draggable", canScroll);
    };
    const setSectionCollapsed = (section, isCollapsed) => {
        const toggleButton = section.querySelector(".news-toggle");
        const scrollArea = section.querySelector(".news-scroll-area");

        section.classList.toggle("is-collapsed", isCollapsed);
        toggleButton?.setAttribute("aria-expanded", String(!isCollapsed));

        if (scrollArea) {
            scrollArea.setAttribute("aria-hidden", String(isCollapsed));
            scrollArea.toggleAttribute("inert", isCollapsed);
            requestAnimationFrame(() => syncDraggableState(scrollArea));
        }
    };

    collapsibleSections.forEach((section) => {
        const toggleButton = section.querySelector(".news-toggle");
        if (!toggleButton) {
            return;
        }

        setSectionCollapsed(section, section.classList.contains("is-collapsed"));

        const toggleSection = () => {
            const shouldCollapse = !section.classList.contains("is-collapsed");

            if (!shouldCollapse) {
                collapsibleSections.forEach((otherSection) => {
                    if (otherSection !== section) {
                        setSectionCollapsed(otherSection, true);
                    }
                });
            }

            setSectionCollapsed(section, shouldCollapse);
        };

        toggleButton.addEventListener("click", () => {
            toggleSection();
        });

        section.addEventListener("click", (event) => {
            const interactiveTarget = getClosestElement(event.target, "a, button, audio, input, select, textarea, [data-draggable-scroll]");
            if (interactiveTarget) {
                return;
            }

            toggleSection();
        });
    });

    const draggableAreas = document.querySelectorAll("[data-draggable-scroll]");

    draggableAreas.forEach((area) => {
        let isDragging = false;
        let startY = 0;
        let startScrollTop = 0;

        area.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) {
                return;
            }

            const interactiveTarget = getClosestElement(event.target, "a, button, audio, input, select, textarea");
            if (interactiveTarget) {
                return;
            }

            if (!area.classList.contains("is-draggable")) {
                return;
            }

            isDragging = true;
            startY = event.clientY;
            startScrollTop = area.scrollTop;
            area.classList.add("is-dragging");
            area.setPointerCapture(event.pointerId);
        });

        area.addEventListener("pointermove", (event) => {
            if (!isDragging) {
                return;
            }

            const deltaY = event.clientY - startY;
            area.scrollTop = startScrollTop - deltaY;
            event.preventDefault();
        });

        const stopDragging = (event) => {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            area.classList.remove("is-dragging");

            if (area.hasPointerCapture(event.pointerId)) {
                area.releasePointerCapture(event.pointerId);
            }
        };

        area.addEventListener("pointerup", stopDragging);
        area.addEventListener("pointercancel", stopDragging);
        area.addEventListener("lostpointercapture", () => {
            isDragging = false;
            area.classList.remove("is-dragging");
        });

        area.addEventListener("transitionend", (event) => {
            if (event.propertyName === "max-height") {
                syncDraggableState(area);
            }
        });

        syncDraggableState(area);
        window.addEventListener("resize", () => syncDraggableState(area));
    });
});
