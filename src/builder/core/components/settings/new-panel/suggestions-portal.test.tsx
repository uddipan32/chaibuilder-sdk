/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { getSuggestionsPortalTarget } from "./suggestions-portal";

describe("getSuggestionsPortalTarget", () => {
  it("portals to the body when the classes input is in the settings panel", () => {
    // Mirrors the styling panel: accordion content clips, so the dropdown must leave it.
    const panel = document.createElement("div");
    panel.innerHTML = `<div class="overflow-hidden"><div id="anchor"></div></div>`;
    document.body.appendChild(panel);

    const anchor = panel.querySelector("#anchor") as HTMLElement;
    expect(getSuggestionsPortalTarget(anchor)).toBe(document.body);

    panel.remove();
  });

  it("portals into the nearest dialog so clicking a suggestion does not dismiss it", () => {
    // In the design tokens modal, a body-level portal would count as an outside
    // click for Radix and close the dialog.
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML = `<div class="overflow-hidden"><div id="anchor"></div></div>`;
    document.body.appendChild(dialog);

    const anchor = dialog.querySelector("#anchor") as HTMLElement;
    expect(getSuggestionsPortalTarget(anchor)).toBe(dialog);

    dialog.remove();
  });

  it("portals into an alert dialog too", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "alertdialog");
    dialog.innerHTML = `<div id="anchor"></div>`;
    document.body.appendChild(dialog);

    const anchor = dialog.querySelector("#anchor") as HTMLElement;
    expect(getSuggestionsPortalTarget(anchor)).toBe(dialog);

    dialog.remove();
  });
});
