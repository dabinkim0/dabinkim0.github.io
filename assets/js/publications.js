document.addEventListener("DOMContentLoaded", () => {
    const preventImageSaveGesture = (event) => {
        event.preventDefault();
    };
    const protectedPublicationImages = document.querySelectorAll(".item-list .publication-figure, .item-list .publication-figure img");

    protectedPublicationImages.forEach((element) => {
        element.addEventListener("contextmenu", preventImageSaveGesture);
        element.addEventListener("dragstart", preventImageSaveGesture);
    });

    document.querySelectorAll(".item-list .publication-figure img").forEach((image) => {
        image.setAttribute("draggable", "false");
    });

    const publicationList = document.querySelector("[data-publication-list]");
    const viewButtons = Array.from(document.querySelectorAll("[data-publication-view]"));
    const filterPanel = document.querySelector("[data-publication-filter-panel]");
    const filterList = document.querySelector("[data-publication-filter-list]");
    const filterStatus = document.querySelector("[data-publication-filter-status]");
    const publicationItems = Array.from(document.querySelectorAll(".publication-item"));

    if (publicationList && viewButtons.length > 0) {
        const defaultPublicationView = "grid-compact";
        const setPublicationView = (view) => {
            const viewClasses = ["is-list", "is-grid", "is-grid-compact"];

            viewClasses.forEach((className) => {
                publicationList.classList.remove(className);
            });

            publicationList.classList.add(`is-${view}`);

            viewButtons.forEach((button) => {
                const isActive = button.dataset.publicationView === view;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });
        };

        viewButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setPublicationView(button.dataset.publicationView);
            });
        });

        setPublicationView(defaultPublicationView);
    }

    if (!filterPanel || !filterList || publicationItems.length === 0) {
        return;
    }

    const configuredFilterTags = ["Generative Models", "Representation Learning"];
    const itemData = publicationItems.map((item) => ({
        item,
        category: item.dataset.publicationCategory?.trim() || ""
    }));
    const categoryCounts = new Map();

    itemData.forEach(({ category }) => {
        if (!category) {
            return;
        }

        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const candidateFilterTags = [
        ...new Set([
            ...configuredFilterTags,
            ...itemData.map(({ category }) => category).filter(Boolean)
        ])
    ];
    const filterTagOrder = new Map(candidateFilterTags.map((tag, index) => [tag, index]));
    const filterTags = candidateFilterTags.sort((tagA, tagB) => {
        const countDiff = (categoryCounts.get(tagB) || 0) - (categoryCounts.get(tagA) || 0);
        return countDiff || filterTagOrder.get(tagA) - filterTagOrder.get(tagB);
    });
    const filterButtons = new Map();
    let activeFilter = null;

    const setFilterButtonState = (button, isActive) => {
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    };

    const updateFilterStatus = () => {
        if (!filterStatus) {
            return;
        }

        if (!activeFilter) {
            filterStatus.textContent = `Showing all ${publicationItems.length} publications.`;
            return;
        }

        const visibleCount = itemData.filter(({ category }) => category === activeFilter).length;
        const noun = visibleCount === 1 ? "publication" : "publications";
        filterStatus.textContent = `Showing ${visibleCount} ${noun} in "${activeFilter}".`;
    };

    const applyFilter = (tag) => {
        activeFilter = tag;
        setFilterButtonState(allButton, !activeFilter);

        filterButtons.forEach((button, buttonTag) => {
            setFilterButtonState(button, buttonTag === activeFilter);
        });

        itemData.forEach(({ item, category }) => {
            item.hidden = Boolean(activeFilter) && category !== activeFilter;
        });

        updateFilterStatus();
    };

    const handleFilterClick = (tag) => {
        applyFilter(activeFilter === tag ? null : tag);
    };

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "publication-filter-chip is-active";
    allButton.textContent = "All";
    allButton.setAttribute("aria-pressed", "true");
    allButton.addEventListener("click", () => applyFilter(null));
    filterList.append(allButton);

    filterTags.forEach((tag) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "publication-filter-chip";
        button.textContent = tag;
        button.dataset.publicationFilter = tag;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => handleFilterClick(tag));
        filterButtons.set(tag, button);
        filterList.append(button);
    });

    applyFilter(null);
});
