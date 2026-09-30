export class Router {
  constructor({ container, context, routes, onBeforeNavigate, onAfterNavigate }) {
    this.container = container;
    this.context = context;
    this.routes = routes;
    this.onBeforeNavigate = onBeforeNavigate;
    this.onAfterNavigate = onAfterNavigate;
    this.currentPage = null;
    this.currentPageId = null;
  }

  init(fallbackPage = "practice") {
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", () => {
        const pageId = location.hash.slice(1);
        this.navigate(pageId, { fromHash: true });
      });

      const hash = location.hash.slice(1);
      const initialPage = this.routes[hash] ? hash : fallbackPage;
      this.navigate(initialPage, { replace: true, fromHash: !!hash });
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
    if (!options.fromHash && typeof history !== "undefined") {
      history.replaceState(null, "", `#${validPageId}`);
    }

    const factory = this.routes[validPageId];
    this.currentPage = factory(this.context);
    this.container.innerHTML = "";
    this.currentPage.mount(this.container, this.context);

    if (this.onAfterNavigate) {
      this.onAfterNavigate(validPageId);
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
