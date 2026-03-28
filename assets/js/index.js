document.addEventListener("DOMContentLoaded", () => {
    const collapsibleSections = document.querySelectorAll("[data-collapsible]");

    collapsibleSections.forEach((section) => {
        const toggleButton = section.querySelector(".news-toggle");
        if (!toggleButton) {
            return;
        }

        toggleButton.addEventListener("click", () => {
            const isCollapsed = section.classList.toggle("is-collapsed");
            toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
        });
    });

    const draggableAreas = document.querySelectorAll("[data-draggable-scroll]");

    draggableAreas.forEach((area) => {
        let isDragging = false;
        let startY = 0;
        let startScrollTop = 0;

        const syncDraggableState = () => {
            const canScroll = area.scrollHeight > area.clientHeight + 4;
            area.classList.toggle("is-draggable", canScroll);
        };

        area.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) {
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

        syncDraggableState();
        window.addEventListener("resize", syncDraggableState);
    });
});
