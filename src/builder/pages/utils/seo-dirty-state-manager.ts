/**
 * SEO Form Dirty State Manager
 *
 * Manages unsaved changes tracking for SEO forms across different pages and languages.
 * Uses global in-memory state to track dirty state per page and language.
 * Provides methods to track, check, and reset dirty state.
 */

interface SeoFormData {
  [key: string]: any;
}

interface SeoDirtyState {
  initial: SeoFormData;
  current: SeoFormData;
}

class SeoDirectyStateManager {
  private static instance: SeoDirectyStateManager;
  // State is now a nested object: { [pageId: string]: { [language: string]: SeoDirtyState } }
  private state: Record<string, Record<string, SeoDirtyState>> = {};

  // Track the current page ID to handle page changes
  private currentPageId: string | null = null;

  private constructor() {}

  static getInstance(): SeoDirectyStateManager {
    if (!SeoDirectyStateManager.instance) {
      SeoDirectyStateManager.instance = new SeoDirectyStateManager();
    }
    return SeoDirectyStateManager.instance;
  }

  /**
   * Initialize form values for a page and language and mark as clean state
   * @param pageId - ID of the current page
   * @param language - Language code (e.g., 'en', 'fr')
   * @param formData - SEO form data to set as initial values
   */
  setInitialValues(pageId: string, language: string, formData: SeoFormData): void {
    if (!this.state[pageId]) {
      this.state[pageId] = {};
    }

    this.state[pageId][language] = {
      initial: { ...formData },
      current: { ...formData },
    };

    this.currentPageId = pageId;
  }

  /**
   * Update current form values to track changes
   * @param pageId - ID of the current page
   * @param language - Language code
   * @param formData - Current form data
   */
  updateCurrentValues(pageId: string, language: string, formData: SeoFormData): void {
    if (!this.state[pageId] || !this.state[pageId][language]) {
      this.setInitialValues(pageId, language, formData);
      return;
    }

    this.state[pageId][language].current = { ...formData };
    this.currentPageId = pageId;
  }

  /**
   * Check if a page and language has unsaved changes
   * @param pageId - ID of the page to check
   * @param language - Language code to check
   * @returns true if there are unsaved changes
   */
  isDirty(pageId: string, language: string): boolean {
    if (!this.state[pageId] || !this.state[pageId][language]) {
      return false;
    }

    const pageState = this.state[pageId][language];
    return JSON.stringify(pageState.initial) !== JSON.stringify(pageState.current);
  }

  /**
   * Mark a page and language as clean (no unsaved changes)
   * @param pageId - ID of the page to mark as clean
   * @param language - Language code to mark as clean
   */
  markClean(pageId: string, language: string): void {
    if (this.state[pageId]?.[language]) {
      this.state[pageId][language].initial = { ...this.state[pageId][language].current };
    }
  }

  /**
   * Get initial values for a page and language
   * @param pageId - ID of the page
   * @param language - Language code
   * @returns Initial form values or null if not found
   */
  getInitialValues(pageId: string, language: string): SeoFormData | null {
    return this.state[pageId]?.[language]?.initial || null;
  }

  /**
   * Clear dirty state for a specific page and language
   * @param pageId - ID of the page to clear
   * @param language - Language code to clear (optional, clears all languages if not provided)
   */
  clearLanguage(pageId: string, language?: string): void {
    if (!this.state[pageId]) return;

    if (language) {
      delete this.state[pageId][language];
    } else {
      delete this.state[pageId];
    }
  }

  /**
   * Clear all dirty states
   */
  clearAll(): void {
    this.state = {};
    this.currentPageId = null;
  }

  /**
   * Clear dirty state when switching pages
   * @param newPageId - ID of the new page being loaded
   */
  onPageChange(newPageId: string): void {
    if (this.currentPageId && this.currentPageId !== newPageId) {
      // Clear the previous page's state if it's different from the new page
      this.clearLanguage(this.currentPageId);
    }
    this.currentPageId = newPageId;
  }
}

// Export singleton instance
export const seoDirectyStateManager = SeoDirectyStateManager.getInstance();

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;

  describe("SeoDirectyStateManager", () => {
    let manager: SeoDirectyStateManager;

    beforeEach(() => {
      manager = SeoDirectyStateManager.getInstance();
      manager.clearAll();
    });

    describe("getInstance", () => {
      it("should return singleton instance", () => {
        const instance1 = SeoDirectyStateManager.getInstance();
        const instance2 = SeoDirectyStateManager.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe("setInitialValues", () => {
      it("should set initial values for a page and language", () => {
        const formData = { title: "Test Title", description: "Test Description" };
        manager.setInitialValues("page1", "en", formData);

        const initialValues = manager.getInitialValues("page1", "en");
        expect(initialValues).toEqual(formData);
      });

      it("should create page state if it doesn't exist", () => {
        const formData = { title: "New Page" };
        manager.setInitialValues("newPage", "fr", formData);

        expect(manager.getInitialValues("newPage", "fr")).toEqual(formData);
      });

      it("should set both initial and current values to the same data", () => {
        const formData = { title: "Test" };
        manager.setInitialValues("page1", "en", formData);

        expect(manager.isDirty("page1", "en")).toBe(false);
      });

      it("should handle multiple languages for the same page", () => {
        const enData = { title: "English Title" };
        const frData = { title: "French Title" };

        manager.setInitialValues("page1", "en", enData);
        manager.setInitialValues("page1", "fr", frData);

        expect(manager.getInitialValues("page1", "en")).toEqual(enData);
        expect(manager.getInitialValues("page1", "fr")).toEqual(frData);
      });
    });

    describe("updateCurrentValues", () => {
      it("should update current values and mark as dirty", () => {
        const initialData = { title: "Initial" };
        const updatedData = { title: "Updated" };

        manager.setInitialValues("page1", "en", initialData);
        manager.updateCurrentValues("page1", "en", updatedData);

        expect(manager.isDirty("page1", "en")).toBe(true);
      });

      it("should set initial values if page/language doesn't exist", () => {
        const formData = { title: "New" };
        manager.updateCurrentValues("page1", "en", formData);

        expect(manager.getInitialValues("page1", "en")).toEqual(formData);
        expect(manager.isDirty("page1", "en")).toBe(false);
      });

      it("should not affect other languages", () => {
        manager.setInitialValues("page1", "en", { title: "English" });
        manager.setInitialValues("page1", "fr", { title: "French" });

        manager.updateCurrentValues("page1", "en", { title: "Updated English" });

        expect(manager.isDirty("page1", "en")).toBe(true);
        expect(manager.isDirty("page1", "fr")).toBe(false);
      });
    });

    describe("isDirty", () => {
      it("should return false when no changes have been made", () => {
        const formData = { title: "Test" };
        manager.setInitialValues("page1", "en", formData);

        expect(manager.isDirty("page1", "en")).toBe(false);
      });

      it("should return true when changes have been made", () => {
        manager.setInitialValues("page1", "en", { title: "Initial" });
        manager.updateCurrentValues("page1", "en", { title: "Updated" });

        expect(manager.isDirty("page1", "en")).toBe(true);
      });

      it("should return false for non-existent page", () => {
        expect(manager.isDirty("nonexistent", "en")).toBe(false);
      });

      it("should return false for non-existent language", () => {
        manager.setInitialValues("page1", "en", { title: "Test" });
        expect(manager.isDirty("page1", "fr")).toBe(false);
      });

      it("should detect changes in nested objects", () => {
        manager.setInitialValues("page1", "en", { meta: { title: "Test" } });
        manager.updateCurrentValues("page1", "en", { meta: { title: "Updated" } });

        expect(manager.isDirty("page1", "en")).toBe(true);
      });
    });

    describe("markClean", () => {
      it("should mark dirty state as clean", () => {
        manager.setInitialValues("page1", "en", { title: "Initial" });
        manager.updateCurrentValues("page1", "en", { title: "Updated" });

        expect(manager.isDirty("page1", "en")).toBe(true);

        manager.markClean("page1", "en");

        expect(manager.isDirty("page1", "en")).toBe(false);
      });

      it("should update initial values to current values", () => {
        manager.setInitialValues("page1", "en", { title: "Initial" });
        manager.updateCurrentValues("page1", "en", { title: "Updated" });
        manager.markClean("page1", "en");

        const initialValues = manager.getInitialValues("page1", "en");
        expect(initialValues).toEqual({ title: "Updated" });
      });

      it("should handle non-existent page gracefully", () => {
        expect(() => manager.markClean("nonexistent", "en")).not.toThrow();
      });

      it("should handle non-existent language gracefully", () => {
        manager.setInitialValues("page1", "en", { title: "Test" });
        expect(() => manager.markClean("page1", "fr")).not.toThrow();
      });
    });

    describe("getInitialValues", () => {
      it("should return initial values for a page and language", () => {
        const formData = { title: "Test", description: "Desc" };
        manager.setInitialValues("page1", "en", formData);

        expect(manager.getInitialValues("page1", "en")).toEqual(formData);
      });

      it("should return null for non-existent page", () => {
        expect(manager.getInitialValues("nonexistent", "en")).toBeNull();
      });

      it("should return null for non-existent language", () => {
        manager.setInitialValues("page1", "en", { title: "Test" });
        expect(manager.getInitialValues("page1", "fr")).toBeNull();
      });
    });

    describe("clearLanguage", () => {
      it("should clear specific language for a page", () => {
        manager.setInitialValues("page1", "en", { title: "English" });
        manager.setInitialValues("page1", "fr", { title: "French" });

        manager.clearLanguage("page1", "en");

        expect(manager.getInitialValues("page1", "en")).toBeNull();
        expect(manager.getInitialValues("page1", "fr")).toEqual({ title: "French" });
      });

      it("should clear all languages when language not specified", () => {
        manager.setInitialValues("page1", "en", { title: "English" });
        manager.setInitialValues("page1", "fr", { title: "French" });

        manager.clearLanguage("page1");

        expect(manager.getInitialValues("page1", "en")).toBeNull();
        expect(manager.getInitialValues("page1", "fr")).toBeNull();
      });

      it("should handle non-existent page gracefully", () => {
        expect(() => manager.clearLanguage("nonexistent", "en")).not.toThrow();
      });
    });

    describe("clearAll", () => {
      it("should clear all state", () => {
        manager.setInitialValues("page1", "en", { title: "Test 1" });
        manager.setInitialValues("page2", "fr", { title: "Test 2" });

        manager.clearAll();

        expect(manager.getInitialValues("page1", "en")).toBeNull();
        expect(manager.getInitialValues("page2", "fr")).toBeNull();
      });

      it("should reset dirty states", () => {
        manager.setInitialValues("page1", "en", { title: "Initial" });
        manager.updateCurrentValues("page1", "en", { title: "Updated" });

        manager.clearAll();

        expect(manager.isDirty("page1", "en")).toBe(false);
      });
    });

    describe("onPageChange", () => {
      it("should clear previous page state when changing pages", () => {
        manager.setInitialValues("page1", "en", { title: "Page 1" });
        manager.onPageChange("page2");

        expect(manager.getInitialValues("page1", "en")).toBeNull();
      });

      it("should not clear state when staying on same page", () => {
        manager.setInitialValues("page1", "en", { title: "Page 1" });
        manager.onPageChange("page1");

        expect(manager.getInitialValues("page1", "en")).toEqual({ title: "Page 1" });
      });

      it("should handle first page load", () => {
        expect(() => manager.onPageChange("page1")).not.toThrow();
      });

      it("should preserve new page state", () => {
        manager.setInitialValues("page1", "en", { title: "Page 1" });
        manager.setInitialValues("page2", "en", { title: "Page 2" });

        manager.onPageChange("page2");

        expect(manager.getInitialValues("page2", "en")).toEqual({ title: "Page 2" });
      });
    });

    describe("complex scenarios", () => {
      it("should handle multiple pages with multiple languages", () => {
        manager.setInitialValues("page1", "en", { title: "Page 1 EN" });
        manager.setInitialValues("page1", "fr", { title: "Page 1 FR" });
        manager.setInitialValues("page2", "en", { title: "Page 2 EN" });

        manager.updateCurrentValues("page1", "en", { title: "Updated Page 1 EN" });

        expect(manager.isDirty("page1", "en")).toBe(true);
        expect(manager.isDirty("page1", "fr")).toBe(false);
        expect(manager.isDirty("page2", "en")).toBe(false);
      });

      it("should handle save workflow", () => {
        manager.setInitialValues("page1", "en", { title: "Initial" });
        manager.updateCurrentValues("page1", "en", { title: "Updated" });

        expect(manager.isDirty("page1", "en")).toBe(true);

        manager.markClean("page1", "en");

        expect(manager.isDirty("page1", "en")).toBe(false);
        expect(manager.getInitialValues("page1", "en")).toEqual({ title: "Updated" });
      });

      it("should handle language switching workflow", () => {
        manager.setInitialValues("page1", "en", { title: "English" });
        manager.updateCurrentValues("page1", "en", { title: "Updated English" });

        manager.setInitialValues("page1", "fr", { title: "French" });

        expect(manager.isDirty("page1", "en")).toBe(true);
        expect(manager.isDirty("page1", "fr")).toBe(false);
      });
    });
  });
}
