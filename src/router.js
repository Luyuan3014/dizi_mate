export class Router {
  constructor({ container, context, routes, onBeforeNavigate, onAfterNavigate }) {
    this.container = container;
    this.context = context;
    this.routes = routes;
    this.onBeforeNavigate = onBeforeNavigate;
    this.onAfterNavigate = onAfterNavigate;
    this.currentPage = null;
    this.currentPageId = null;
    this.boundLocationChange = () => {
      const pageId = typeof location !== "undefined" ? location.hash.slice(1) : "";
      this.navigate(pageId, { fromHistory: true });
    };
  }

  init(fallbackPage = "practice") {
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", this.boundLocationChange);
      window.addEventListener("popstate", this.boundLocationChange);

      const hash = location.hash.slice(1);
      const initialPage = this.routes[hash] ? hash : fallbackPage;
      this.navigate(initialPage, { replace: true, fromHistory: !!hash });
    }
  }

  navigate(pageId, options = {}) {
    const validPageId = this.routes[pageId] ? pageId : "practice";
    if (this.currentPageId === validPageId && this.currentPage) {
      return;
    }

    if (this.onBeforeNavigate) {
      this.onBeforeNavigate(this.currentPageId, validPageId);
    }

    if (this.currentPage && typeof this.currentPage.unmount === "function") {
      this.currentPage.unmount();
    }

    this.currentPageId = validPageId;
    if (typeof history !== "undefined" && typeof location !== "undefined") {
      const nextHash = `#${validPageId}`;
      if (location.hash !== nextHash) {
        if (options.replace) history.replaceState({ pageId: validPageId }, "", nextHash);
        else if (!options.fromHistory) history.pushState({ pageId: validPageId }, "", nextHash);
      }
    }

    const factory = this.routes[validPageId];
    this.currentPage = factory(this.context);
    this.container.innerHTML = "";
    this.currentPage.mount(this.container, this.context);

    if (this.onAfterNavigate) {
      this.onAfterNavigate(validPageId);
    }

    const heading = typeof this.container?.querySelector === "function"
      ? this.container.querySelector("[data-page-title], h1")
      : null;
    const focusTarget = heading || this.container;
    if (focusTarget && typeof focusTarget.focus === "function") {
      if (!focusTarget.hasAttribute("tabindex") && focusTarget === this.container) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
      } else {
        focusTarget.focus({ preventScroll: true });
      }
    }

    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }

  getCurrentPageId() {
    return this.currentPageId;
  }
}
