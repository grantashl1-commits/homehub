import { describe, expect, it } from "vitest";
import { categoriseItem, parseIngredient, parseQty, toNZName } from "./signal-parity";

/** Shape an item the way `signalAddItem` does, then build SIGNAL's itemKey. */
function shapeAndKey(raw: string): string {
  const parsed = parseIngredient(raw);
  const nzName = toNZName(parsed.name);
  const item = {
    name: nzName.charAt(0).toUpperCase() + nzName.slice(1),
    totalQty: parseQty(parsed.quantity) || 1,
    unit: parsed.unit,
    category: categoriseItem(nzName),
    searchTerm: toNZName(parsed.searchTerm),
  };
  return `${item.category}:${item.name}:${item.unit}:${item.totalQty}`;
}

describe("parseIngredient", () => {
  it("parses quantity and unit", () => {
    expect(parseIngredient("250g chicken thighs, diced")).toMatchObject({ quantity: "250", unit: "g", name: "chicken thighs" });
    expect(parseIngredient("2 apples")).toMatchObject({ quantity: "2", unit: "", name: "apples" });
    expect(parseIngredient("1 cup red lentils")).toMatchObject({ quantity: "1", unit: "cup", name: "red lentils" });
    expect(parseIngredient("1 x 400g can chickpeas")).toMatchObject({ quantity: "400", unit: "g", name: "chickpeas" });
  });
});

describe("toNZName", () => {
  it("translates to NZ wording", () => {
    expect(toNZName("bell pepper")).toBe("capsicum");
    expect(toNZName("cilantro")).toBe("coriander");
    expect(toNZName("sweet potato")).toBe("kūmara");
    expect(toNZName("yogurt")).toBe("yoghurt");
  });
});

describe("categoriseItem", () => {
  it("categorises like SIGNAL", () => {
    expect(categoriseItem("tofu")).toBe("protein");
    expect(categoriseItem("chickpeas")).toBe("protein");
    expect(categoriseItem("milk")).toBe("dairy");
    expect(categoriseItem("frozen peas")).toBe("frozen");
    expect(categoriseItem("tomato")).toBe("produce");
  });
});

describe("itemKey parity", () => {
  it("builds the same itemKey as SIGNAL", () => {
    expect(shapeAndKey("2 apples")).toBe("produce:Apples::2");
    expect(shapeAndKey("bell pepper")).toBe("produce:Capsicum::1");
    expect(shapeAndKey("1 x 400g can chickpeas")).toBe("protein:Chickpeas:g:400");
    expect(shapeAndKey("milk")).toBe("dairy:Milk::1");
  });
});
