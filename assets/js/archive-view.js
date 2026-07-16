document.addEventListener("DOMContentLoaded", () => {
    const validViews = new Set(["list", "grid", "grid-compact"]);

    document.querySelectorAll("[data-archive-controls]").forEach((controls) => {
        const targetId = controls.dataset.archiveControls;
        const archive = targetId ? document.getElementById(targetId) : null;
        const buttons = Array.from(controls.querySelectorAll("[data-archive-view-option]"));

        if (!archive || buttons.length === 0) {
            return;
        }

        const setView = (view) => {
            if (!validViews.has(view)) {
                return;
            }

            archive.dataset.view = view;

            buttons.forEach((button) => {
                const isActive = button.dataset.archiveViewOption === view;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });

            archive.dispatchEvent(new CustomEvent("archive:viewchange", {
                detail: { view }
            }));
        };

        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                setView(button.dataset.archiveViewOption);
            });
        });

        setView(archive.dataset.view || "grid-compact");
    });
});
