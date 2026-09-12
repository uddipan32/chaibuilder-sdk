import { describe, expect, it } from "vitest";
import { fake } from "~/tests/setup/fakers";
import { withTestDB } from "~/tests/setup/transaction-manager";
import { getPageById } from "~/tests/utils/assertions";
import { UpdatePageAction } from "./update-page";

describe("UpdatePageAction - Dynamic Sync Integration", () => {
  it("should sync dynamic and dynamicSlugCustom fields to secondary pages", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      // 1. Arrange
      const primaryPage = await seed("appPages", fake.appPages({ dynamic: false }));
      const secondaryPage = await seed("appPages", fake.appPages({ primaryPage: primaryPage.id, dynamic: false }));

      const payload = {
        id: primaryPage.id,
        dynamic: true,
        dynamicSlugCustom: "custom-slug-field",
      };

      // 2. Act
      const result = await action(UpdatePageAction).run(payload);

      // 3. Assert
      expect(result.page).toBeDefined();

      const updatedPrimary = await getPageById(db, primaryPage.id);
      expect(updatedPrimary).not.toBeNull();
      expect(updatedPrimary?.dynamic).toBe(true);
      expect(updatedPrimary?.dynamicSlugCustom).toBe("custom-slug-field");

      const updatedSecondary = await getPageById(db, secondaryPage.id);
      expect(updatedSecondary).not.toBeNull();
      expect(updatedSecondary?.dynamic).toBe(true);
      expect(updatedSecondary?.dynamicSlugCustom).toBe("custom-slug-field");
    });
  });
});
