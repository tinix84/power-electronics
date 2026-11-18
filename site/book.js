"use strict";

// On phones Quarto opens the book contents below its toolbar and expects the
// toolbar at the top of the window. The site header sits above the toolbar, so
// scroll the header out of view before the contents panel opens.
document.addEventListener("show.bs.collapse", (event) => {
  if (event.target.id !== "quarto-sidebar") return;
  const header = document.querySelector("header.site-header");
  if (header && window.scrollY < header.offsetHeight) {
    window.scrollTo({ top: header.offsetHeight, behavior: "instant" });
  }
});
