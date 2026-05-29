import { describe, expect, it } from "vitest";

import type { StageContentApiData } from "@/types/stage-content-api";
import {
  isStageContentEnvelope,
  mapStageContentToInstructionOverride,
} from "@/utils/map-stage-content-api";

const sample: StageContentApiData = {
  game_id: "c2cfa152-b551-4ef0-840f-6f5147ba5433",
  stage_id: "774895cc-e68d-4c04-9ee6-a64a9cc763c5",
  game_index: 2,
  content_section: {
    language: "HI",
    content: {
      pages: [
        {
          title: "परिचय",
          points: [
            {
              title: "मनोरंजन",
              description: "तेज़ गति की चुनौती का आनंद लें।",
            },
          ],
          point_type: "UNORDERED",
          description: "इस रोमांचक खेल में अपनी प्रतिक्रिया और एकाग्रता परखें।",
          visible_in_app: true,
        },
        {
          title: "हिडेन",
          points: [],
          point_type: "ORDERED",
          description: "x",
          visible_in_app: false,
        },
      ],
      play_now_button: "अभी खेलें",
      learn_how_to_play: "खेलना सीखें",
      game_title: "इन्फिनिटी लूप",
      game_tagline: "कस्टम टैगलाइन",
    },
  },
};

describe("mapStageContentToInstructionOverride", () => {
  it("detects stage-content envelope", () => {
    expect(isStageContentEnvelope(sample)).toBe(true);
    expect(isStageContentEnvelope({ gameMeta: {}, settings: {} })).toBe(false);
  });

  it("maps game_index to Game label, language, pages (respect visible_in_app), CTAs", () => {
    const mapped = mapStageContentToInstructionOverride(sample);
    expect(mapped).not.toBeNull();
    expect(mapped!.gameLabel).toBe("GAME 2");
    expect(mapped!.language).toBe("HI");
    expect(mapped!.pages).toHaveLength(1);
    expect(mapped!.pages![0]!.title).toBe("परिचय");
    expect(mapped!.pages![0]!.pointType).toBe("UNORDERED");
    expect(mapped!.playNowButton).toBe("अभी खेलें");
    expect(mapped!.learnHowToPlay).toBe("खेलना सीखें");
    expect(mapped!.gameTitle).toBe("इन्फिनिटी लूप");
    expect(mapped!.headerTagline).toBe("कस्टम टैगलाइन");
  });

  it("defaults game label index when game_index missing", () => {
    const mapped = mapStageContentToInstructionOverride({
      ...sample,
      game_index: undefined,
    });
    expect(mapped?.gameLabel).toBe("GAME 1");
  });

  it("falls back to GAME 1 when game_index is invalid", () => {
    const mapped = mapStageContentToInstructionOverride({
      ...sample,
      game_index: 0,
    });
    expect(mapped?.gameLabel).toBe("GAME 1");
  });
});
