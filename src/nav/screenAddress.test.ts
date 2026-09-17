import { describe, expect, it } from "vitest";
import {
  GAME_HASH,
  GUIDE_HASH,
  MENU_HASH,
  type Screen,
  hashForScreen,
  screenFromHash,
} from "./screenAddress";

describe("screenFromHash", () => {
  it("names the guide and the game from their own addresses", () => {
    expect(screenFromHash(GUIDE_HASH)).toBe("guide");
    expect(screenFromHash(GAME_HASH)).toBe("game");
  });

  it("names the main menu from an empty fragment", () => {
    expect(screenFromHash(MENU_HASH)).toBe("start");
    expect(screenFromHash("#")).toBe("start");
  });

  it("names the main menu from an address the app never issued", () => {
    expect(screenFromHash("#nonsense")).toBe("start");
    expect(screenFromHash("#how-to-play/extra")).toBe("start");
  });

  it("matches exactly, so a differently cased address is not recognised", () => {
    expect(screenFromHash("#GAME")).toBe("start");
    expect(screenFromHash("#How-To-Play")).toBe("start");
  });
});

describe("hashForScreen", () => {
  it("gives each screen its own address", () => {
    expect(hashForScreen("start")).toBe("");
    expect(hashForScreen("guide")).toBe("#how-to-play");
    expect(hashForScreen("game")).toBe("#game");
  });

  it("round-trips every screen through its address", () => {
    const screens: readonly Screen[] = ["start", "guide", "game"];
    for (const screen of screens) {
      expect(screenFromHash(hashForScreen(screen))).toBe(screen);
    }
  });
});
