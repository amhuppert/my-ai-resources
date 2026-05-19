import { describe, test, expect } from "bun:test";
import {
  ITEM_LABELS,
  ITEMS_BY_SCOPE,
  getItemsForScopes,
  scopeChoiceToScopes,
  type InstallItem,
} from "./install-items";

describe("scopeChoiceToScopes", () => {
  test("expands 'both' to user and project", () => {
    expect(scopeChoiceToScopes("both")).toEqual(["user", "project"]);
  });

  test("returns single scope for 'user'", () => {
    expect(scopeChoiceToScopes("user")).toEqual(["user"]);
  });

  test("returns single scope for 'project'", () => {
    expect(scopeChoiceToScopes("project")).toEqual(["project"]);
  });
});

describe("getItemsForScopes", () => {
  test("returns only user items for user scope", () => {
    const items = getItemsForScopes(["user"]);
    expect(items).toEqual([...ITEMS_BY_SCOPE.user]);
  });

  test("returns only project items for project scope", () => {
    const items = getItemsForScopes(["project"]);
    expect(items).toEqual([...ITEMS_BY_SCOPE.project]);
  });

  test("returns combined unique items for both scopes", () => {
    const items = getItemsForScopes(["user", "project"]);
    expect(items).toEqual([
      ...ITEMS_BY_SCOPE.user,
      ...ITEMS_BY_SCOPE.project,
    ]);
  });
});

describe("ITEM_LABELS", () => {
  test("has a label for every install item", () => {
    const allItems: InstallItem[] = [
      ...ITEMS_BY_SCOPE.user,
      ...ITEMS_BY_SCOPE.project,
    ];
    for (const item of allItems) {
      expect(ITEM_LABELS[item]).toBeDefined();
      expect(ITEM_LABELS[item].length).toBeGreaterThan(0);
    }
  });

  test("labels do not contain commas (gum --selected delimiter)", () => {
    for (const label of Object.values(ITEM_LABELS)) {
      expect(label).not.toContain(",");
    }
  });
});
