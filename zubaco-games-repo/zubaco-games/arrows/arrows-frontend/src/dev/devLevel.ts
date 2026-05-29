/**
 * DEV LEVEL CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 * Paste any ServerBoard level data you want to test here.
 * Enable this bypass by adding the following line to your .env.local file:
 *
 *   VITE_DEV_LEVEL=true
 *
 * The game will load this level directly in demo mode, skipping all API calls.
 *
 * Level data format:
 *
 *   gridSize  — { x: columns, y: rows }
 *   arrows    — each arrow needs:
 *     waypoints     — grid coords from TAIL → HEAD, e.g. [{x:0,y:0},{x:1,y:0}]
 *     headDirection — "up" | "down" | "left" | "right"
 *     color         — integer 0xRRGGBB, e.g. 0xd4a017 for gold
 *     arrowId       — optional unique string id
 */

import type { ServerBoard } from "@/game/gameTypes";

const devLevel: ServerBoard = {
  id: "4",
  name: "HL04",
  gridSize: {
    x: 42,
    y: 42,
  },
  arrows: [
    {
      waypoints: [
        {
          x: 19,
          y: 41,
        },
        {
          x: 18,
          y: 41,
        },
        {
          x: 18,
          y: 40,
        },
        {
          x: 19,
          y: 40,
        },
        {
          x: 20,
          y: 40,
        },
        {
          x: 20,
          y: 41,
        },
        {
          x: 21,
          y: 41,
        },
        {
          x: 21,
          y: 40,
        },
        {
          x: 22,
          y: 40,
        },
        {
          x: 22,
          y: 41,
        },
      ],
      headDirection: "up",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 39,
        },
        {
          x: 21,
          y: 39,
        },
        {
          x: 20,
          y: 39,
        },
        {
          x: 19,
          y: 39,
        },
        {
          x: 18,
          y: 39,
        },
        {
          x: 17,
          y: 39,
        },
        {
          x: 16,
          y: 39,
        },
        {
          x: 15,
          y: 39,
        },
        {
          x: 15,
          y: 40,
        },
        {
          x: 16,
          y: 40,
        },
        {
          x: 16,
          y: 41,
        },
      ],
      headDirection: "up",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 35,
        },
        {
          x: 22,
          y: 36,
        },
        {
          x: 22,
          y: 37,
        },
        {
          x: 22,
          y: 38,
        },
        {
          x: 21,
          y: 38,
        },
        {
          x: 20,
          y: 38,
        },
        {
          x: 19,
          y: 38,
        },
        {
          x: 18,
          y: 38,
        },
        {
          x: 17,
          y: 38,
        },
        {
          x: 16,
          y: 38,
        },
        {
          x: 15,
          y: 38,
        },
      ],
      headDirection: "left",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 20,
          y: 37,
        },
        {
          x: 19,
          y: 37,
        },
        {
          x: 18,
          y: 37,
        },
        {
          x: 17,
          y: 37,
        },
        {
          x: 16,
          y: 37,
        },
        {
          x: 15,
          y: 37,
        },
      ],
      headDirection: "left",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 39,
        },
        {
          x: 24,
          y: 39,
        },
        {
          x: 25,
          y: 39,
        },
      ],
      headDirection: "right",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 34,
        },
        {
          x: 23,
          y: 34,
        },
        {
          x: 23,
          y: 35,
        },
        {
          x: 23,
          y: 36,
        },
        {
          x: 23,
          y: 37,
        },
        {
          x: 23,
          y: 38,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 38,
        },
        {
          x: 24,
          y: 38,
        },
      ],
      headDirection: "left",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 37,
        },
        {
          x: 25,
          y: 37,
        },
        {
          x: 25,
          y: 36,
        },
        {
          x: 25,
          y: 35,
        },
        {
          x: 25,
          y: 34,
        },
        {
          x: 26,
          y: 34,
        },
        {
          x: 26,
          y: 35,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 34,
        },
        {
          x: 24,
          y: 35,
        },
        {
          x: 24,
          y: 36,
        },
      ],
      headDirection: "up",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 41,
        },
        {
          x: 23,
          y: 41,
        },
        {
          x: 23,
          y: 40,
        },
        {
          x: 24,
          y: 40,
        },
        {
          x: 25,
          y: 40,
        },
        {
          x: 26,
          y: 40,
        },
        {
          x: 26,
          y: 39,
        },
        {
          x: 27,
          y: 39,
        },
      ],
      headDirection: "right",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 27,
          y: 37,
        },
        {
          x: 28,
          y: 37,
        },
        {
          x: 28,
          y: 38,
        },
        {
          x: 27,
          y: 38,
        },
        {
          x: 26,
          y: 38,
        },
        {
          x: 26,
          y: 37,
        },
        {
          x: 26,
          y: 36,
        },
        {
          x: 27,
          y: 36,
        },
      ],
      headDirection: "right",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 33,
        },
        {
          x: 24,
          y: 33,
        },
        {
          x: 25,
          y: 33,
        },
        {
          x: 26,
          y: 33,
        },
        {
          x: 27,
          y: 33,
        },
        {
          x: 27,
          y: 34,
        },
        {
          x: 27,
          y: 35,
        },
      ],
      headDirection: "up",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 32,
        },
        {
          x: 22,
          y: 32,
        },
      ],
      headDirection: "left",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 26,
          y: 30,
        },
        {
          x: 26,
          y: 31,
        },
        {
          x: 25,
          y: 31,
        },
        {
          x: 25,
          y: 30,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 29,
        },
        {
          x: 26,
          y: 29,
        },
        {
          x: 27,
          y: 29,
        },
        {
          x: 27,
          y: 30,
        },
        {
          x: 27,
          y: 31,
        },
        {
          x: 27,
          y: 32,
        },
        {
          x: 26,
          y: 32,
        },
        {
          x: 25,
          y: 32,
        },
        {
          x: 24,
          y: 32,
        },
        {
          x: 24,
          y: 31,
        },
        {
          x: 23,
          y: 31,
        },
        {
          x: 22,
          y: 31,
        },
      ],
      headDirection: "left",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 29,
        },
        {
          x: 24,
          y: 30,
        },
        {
          x: 23,
          y: 30,
        },
        {
          x: 22,
          y: 30,
        },
        {
          x: 21,
          y: 30,
        },
        {
          x: 21,
          y: 31,
        },
        {
          x: 21,
          y: 32,
        },
        {
          x: 21,
          y: 33,
        },
        {
          x: 21,
          y: 34,
        },
        {
          x: 21,
          y: 35,
        },
        {
          x: 20,
          y: 35,
        },
        {
          x: 19,
          y: 35,
        },
        {
          x: 18,
          y: 35,
        },
        {
          x: 17,
          y: 35,
        },
        {
          x: 16,
          y: 35,
        },
      ],
      headDirection: "left",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 36,
        },
        {
          x: 17,
          y: 36,
        },
        {
          x: 18,
          y: 36,
        },
        {
          x: 19,
          y: 36,
        },
        {
          x: 20,
          y: 36,
        },
        {
          x: 21,
          y: 36,
        },
        {
          x: 21,
          y: 37,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 20,
          y: 33,
        },
        {
          x: 20,
          y: 34,
        },
      ],
      headDirection: "up",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 28,
        },
        {
          x: 22,
          y: 29,
        },
      ],
      headDirection: "up",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 29,
        },
        {
          x: 23,
          y: 28,
        },
        {
          x: 24,
          y: 28,
        },
        {
          x: 25,
          y: 28,
        },
        {
          x: 26,
          y: 28,
        },
        {
          x: 27,
          y: 28,
        },
        {
          x: 28,
          y: 28,
        },
        {
          x: 29,
          y: 28,
        },
        {
          x: 30,
          y: 28,
        },
        {
          x: 31,
          y: 28,
        },
      ],
      headDirection: "right",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 30,
          y: 37,
        },
        {
          x: 29,
          y: 37,
        },
      ],
      headDirection: "left",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 34,
        },
        {
          x: 32,
          y: 35,
        },
        {
          x: 31,
          y: 35,
        },
        {
          x: 30,
          y: 35,
        },
        {
          x: 29,
          y: 35,
        },
        {
          x: 29,
          y: 34,
        },
        {
          x: 29,
          y: 33,
        },
        {
          x: 30,
          y: 33,
        },
        {
          x: 31,
          y: 33,
        },
        {
          x: 32,
          y: 33,
        },
        {
          x: 33,
          y: 33,
        },
        {
          x: 33,
          y: 34,
        },
        {
          x: 33,
          y: 35,
        },
        {
          x: 33,
          y: 36,
        },
        {
          x: 32,
          y: 36,
        },
        {
          x: 31,
          y: 36,
        },
        {
          x: 30,
          y: 36,
        },
        {
          x: 29,
          y: 36,
        },
        {
          x: 28,
          y: 36,
        },
        {
          x: 28,
          y: 35,
        },
        {
          x: 28,
          y: 34,
        },
        {
          x: 28,
          y: 33,
        },
        {
          x: 28,
          y: 32,
        },
        {
          x: 29,
          y: 32,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 30,
          y: 34,
        },
        {
          x: 31,
          y: 34,
        },
      ],
      headDirection: "right",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 35,
          y: 34,
        },
        {
          x: 35,
          y: 35,
        },
        {
          x: 34,
          y: 35,
        },
        {
          x: 34,
          y: 34,
        },
        {
          x: 34,
          y: 33,
        },
        {
          x: 35,
          y: 33,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 28,
          y: 29,
        },
        {
          x: 28,
          y: 30,
        },
        {
          x: 28,
          y: 31,
        },
        {
          x: 29,
          y: 31,
        },
        {
          x: 30,
          y: 31,
        },
        {
          x: 30,
          y: 32,
        },
        {
          x: 31,
          y: 32,
        },
        {
          x: 32,
          y: 32,
        },
      ],
      headDirection: "right",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 31,
        },
        {
          x: 31,
          y: 31,
        },
        {
          x: 31,
          y: 30,
        },
        {
          x: 32,
          y: 30,
        },
        {
          x: 33,
          y: 30,
        },
        {
          x: 33,
          y: 31,
        },
        {
          x: 33,
          y: 32,
        },
        {
          x: 34,
          y: 32,
        },
        {
          x: 35,
          y: 32,
        },
        {
          x: 36,
          y: 32,
        },
        {
          x: 36,
          y: 33,
        },
        {
          x: 36,
          y: 34,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 34,
          y: 30,
        },
        {
          x: 35,
          y: 30,
        },
      ],
      headDirection: "right",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 38,
          y: 33,
        },
        {
          x: 37,
          y: 33,
        },
        {
          x: 37,
          y: 32,
        },
        {
          x: 38,
          y: 32,
        },
        {
          x: 39,
          y: 32,
        },
      ],
      headDirection: "right",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 36,
          y: 30,
        },
        {
          x: 37,
          y: 30,
        },
        {
          x: 38,
          y: 30,
        },
        {
          x: 38,
          y: 31,
        },
        {
          x: 37,
          y: 31,
        },
        {
          x: 36,
          y: 31,
        },
        {
          x: 35,
          y: 31,
        },
        {
          x: 34,
          y: 31,
        },
      ],
      headDirection: "left",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 37,
          y: 29,
        },
        {
          x: 36,
          y: 29,
        },
        {
          x: 35,
          y: 29,
        },
        {
          x: 34,
          y: 29,
        },
        {
          x: 33,
          y: 29,
        },
        {
          x: 32,
          y: 29,
        },
        {
          x: 31,
          y: 29,
        },
        {
          x: 30,
          y: 29,
        },
        {
          x: 29,
          y: 29,
        },
        {
          x: 29,
          y: 30,
        },
        {
          x: 30,
          y: 30,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 37,
          y: 28,
        },
        {
          x: 38,
          y: 28,
        },
        {
          x: 38,
          y: 29,
        },
        {
          x: 39,
          y: 29,
        },
        {
          x: 39,
          y: 30,
        },
        {
          x: 39,
          y: 31,
        },
      ],
      headDirection: "up",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 28,
        },
        {
          x: 33,
          y: 28,
        },
        {
          x: 34,
          y: 28,
        },
        {
          x: 35,
          y: 28,
        },
        {
          x: 36,
          y: 28,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 39,
          y: 26,
        },
        {
          x: 39,
          y: 27,
        },
        {
          x: 39,
          y: 28,
        },
      ],
      headDirection: "up",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 35,
        },
        {
          x: 14,
          y: 35,
        },
        {
          x: 14,
          y: 36,
        },
        {
          x: 14,
          y: 37,
        },
        {
          x: 14,
          y: 38,
        },
        {
          x: 14,
          y: 39,
        },
        {
          x: 13,
          y: 39,
        },
        {
          x: 13,
          y: 38,
        },
        {
          x: 13,
          y: 37,
        },
        {
          x: 13,
          y: 36,
        },
        {
          x: 13,
          y: 35,
        },
        {
          x: 13,
          y: 34,
        },
        {
          x: 12,
          y: 34,
        },
      ],
      headDirection: "left",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 12,
          y: 38,
        },
        {
          x: 12,
          y: 37,
        },
        {
          x: 12,
          y: 36,
        },
        {
          x: 12,
          y: 35,
        },
        {
          x: 11,
          y: 35,
        },
        {
          x: 10,
          y: 35,
        },
        {
          x: 9,
          y: 35,
        },
        {
          x: 8,
          y: 35,
        },
        {
          x: 7,
          y: 35,
        },
        {
          x: 6,
          y: 35,
        },
      ],
      headDirection: "left",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 10,
          y: 37,
        },
        {
          x: 11,
          y: 37,
        },
        {
          x: 11,
          y: 36,
        },
        {
          x: 10,
          y: 36,
        },
        {
          x: 9,
          y: 36,
        },
        {
          x: 8,
          y: 36,
        },
        {
          x: 7,
          y: 36,
        },
      ],
      headDirection: "left",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 39,
          y: 25,
        },
        {
          x: 39,
          y: 24,
        },
        {
          x: 39,
          y: 23,
        },
        {
          x: 39,
          y: 22,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 33,
          y: 22,
        },
        {
          x: 33,
          y: 23,
        },
        {
          x: 33,
          y: 24,
        },
        {
          x: 33,
          y: 25,
        },
        {
          x: 33,
          y: 26,
        },
        {
          x: 33,
          y: 27,
        },
        {
          x: 34,
          y: 27,
        },
        {
          x: 35,
          y: 27,
        },
        {
          x: 36,
          y: 27,
        },
        {
          x: 37,
          y: 27,
        },
        {
          x: 38,
          y: 27,
        },
        {
          x: 38,
          y: 26,
        },
        {
          x: 38,
          y: 25,
        },
        {
          x: 38,
          y: 24,
        },
        {
          x: 38,
          y: 23,
        },
        {
          x: 38,
          y: 22,
        },
      ],
      headDirection: "down",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 28,
        },
        {
          x: 16,
          y: 28,
        },
        {
          x: 17,
          y: 28,
        },
        {
          x: 18,
          y: 28,
        },
        {
          x: 19,
          y: 28,
        },
        {
          x: 20,
          y: 28,
        },
        {
          x: 20,
          y: 29,
        },
        {
          x: 20,
          y: 30,
        },
        {
          x: 20,
          y: 31,
        },
        {
          x: 20,
          y: 32,
        },
        {
          x: 19,
          y: 32,
        },
        {
          x: 18,
          y: 32,
        },
        {
          x: 17,
          y: 32,
        },
        {
          x: 16,
          y: 32,
        },
        {
          x: 15,
          y: 32,
        },
        {
          x: 14,
          y: 32,
        },
        {
          x: 14,
          y: 31,
        },
        {
          x: 14,
          y: 30,
        },
        {
          x: 14,
          y: 29,
        },
        {
          x: 14,
          y: 28,
        },
        {
          x: 14,
          y: 27,
        },
        {
          x: 15,
          y: 27,
        },
        {
          x: 16,
          y: 27,
        },
        {
          x: 17,
          y: 27,
        },
        {
          x: 18,
          y: 27,
        },
        {
          x: 19,
          y: 27,
        },
        {
          x: 20,
          y: 27,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 31,
        },
        {
          x: 15,
          y: 30,
        },
        {
          x: 15,
          y: 29,
        },
        {
          x: 16,
          y: 29,
        },
        {
          x: 16,
          y: 30,
        },
        {
          x: 16,
          y: 31,
        },
      ],
      headDirection: "up",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 29,
        },
        {
          x: 17,
          y: 30,
        },
        {
          x: 17,
          y: 31,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 18,
          y: 29,
        },
        {
          x: 18,
          y: 30,
        },
        {
          x: 18,
          y: 31,
        },
      ],
      headDirection: "up",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 24,
        },
        {
          x: 16,
          y: 25,
        },
        {
          x: 16,
          y: 26,
        },
        {
          x: 15,
          y: 26,
        },
        {
          x: 14,
          y: 26,
        },
        {
          x: 13,
          y: 26,
        },
        {
          x: 13,
          y: 27,
        },
        {
          x: 13,
          y: 28,
        },
        {
          x: 13,
          y: 29,
        },
        {
          x: 13,
          y: 30,
        },
        {
          x: 13,
          y: 31,
        },
        {
          x: 13,
          y: 32,
        },
        {
          x: 13,
          y: 33,
        },
        {
          x: 14,
          y: 33,
        },
        {
          x: 15,
          y: 33,
        },
        {
          x: 16,
          y: 33,
        },
        {
          x: 17,
          y: 33,
        },
        {
          x: 18,
          y: 33,
        },
        {
          x: 19,
          y: 33,
        },
        {
          x: 19,
          y: 34,
        },
        {
          x: 18,
          y: 34,
        },
        {
          x: 17,
          y: 34,
        },
        {
          x: 16,
          y: 34,
        },
        {
          x: 15,
          y: 34,
        },
        {
          x: 14,
          y: 34,
        },
      ],
      headDirection: "left",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 25,
        },
        {
          x: 14,
          y: 25,
        },
      ],
      headDirection: "left",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 23,
        },
        {
          x: 15,
          y: 23,
        },
        {
          x: 15,
          y: 24,
        },
        {
          x: 14,
          y: 24,
        },
        {
          x: 14,
          y: 23,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 12,
          y: 24,
        },
        {
          x: 12,
          y: 23,
        },
        {
          x: 13,
          y: 23,
        },
        {
          x: 13,
          y: 24,
        },
        {
          x: 13,
          y: 25,
        },
      ],
      headDirection: "up",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 29,
        },
        {
          x: 11,
          y: 30,
        },
        {
          x: 11,
          y: 31,
        },
        {
          x: 11,
          y: 32,
        },
        {
          x: 11,
          y: 33,
        },
        {
          x: 12,
          y: 33,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 12,
          y: 31,
        },
        {
          x: 12,
          y: 32,
        },
      ],
      headDirection: "up",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 8,
          y: 33,
        },
        {
          x: 8,
          y: 32,
        },
        {
          x: 8,
          y: 31,
        },
        {
          x: 8,
          y: 30,
        },
        {
          x: 8,
          y: 29,
        },
        {
          x: 9,
          y: 29,
        },
        {
          x: 10,
          y: 29,
        },
        {
          x: 10,
          y: 30,
        },
        {
          x: 10,
          y: 31,
        },
        {
          x: 10,
          y: 32,
        },
        {
          x: 10,
          y: 33,
        },
        {
          x: 10,
          y: 34,
        },
        {
          x: 9,
          y: 34,
        },
        {
          x: 8,
          y: 34,
        },
        {
          x: 7,
          y: 34,
        },
        {
          x: 6,
          y: 34,
        },
        {
          x: 5,
          y: 34,
        },
        {
          x: 5,
          y: 33,
        },
        {
          x: 5,
          y: 32,
        },
        {
          x: 5,
          y: 31,
        },
        {
          x: 5,
          y: 30,
        },
        {
          x: 5,
          y: 29,
        },
        {
          x: 5,
          y: 28,
        },
      ],
      headDirection: "down",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 6,
          y: 33,
        },
        {
          x: 7,
          y: 33,
        },
      ],
      headDirection: "right",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 6,
          y: 32,
        },
        {
          x: 7,
          y: 32,
        },
        {
          x: 7,
          y: 31,
        },
        {
          x: 6,
          y: 31,
        },
      ],
      headDirection: "left",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 7,
          y: 30,
        },
        {
          x: 6,
          y: 30,
        },
      ],
      headDirection: "left",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 6,
          y: 28,
        },
        {
          x: 6,
          y: 29,
        },
      ],
      headDirection: "up",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 3,
          y: 33,
        },
        {
          x: 4,
          y: 33,
        },
      ],
      headDirection: "right",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 3,
          y: 31,
        },
        {
          x: 3,
          y: 30,
        },
        {
          x: 3,
          y: 29,
        },
        {
          x: 3,
          y: 28,
        },
        {
          x: 4,
          y: 28,
        },
        {
          x: 4,
          y: 29,
        },
        {
          x: 4,
          y: 30,
        },
        {
          x: 4,
          y: 31,
        },
        {
          x: 4,
          y: 32,
        },
      ],
      headDirection: "up",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 3,
          y: 32,
        },
        {
          x: 2,
          y: 32,
        },
        {
          x: 1,
          y: 32,
        },
        {
          x: 1,
          y: 31,
        },
        {
          x: 1,
          y: 30,
        },
        {
          x: 1,
          y: 29,
        },
        {
          x: 1,
          y: 28,
        },
        {
          x: 1,
          y: 27,
        },
      ],
      headDirection: "down",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 7,
          y: 29,
        },
        {
          x: 7,
          y: 28,
        },
        {
          x: 7,
          y: 27,
        },
        {
          x: 6,
          y: 27,
        },
        {
          x: 5,
          y: 27,
        },
        {
          x: 4,
          y: 27,
        },
        {
          x: 3,
          y: 27,
        },
        {
          x: 2,
          y: 27,
        },
        {
          x: 2,
          y: 28,
        },
        {
          x: 2,
          y: 29,
        },
        {
          x: 2,
          y: 30,
        },
        {
          x: 2,
          y: 31,
        },
      ],
      headDirection: "up",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 2,
          y: 23,
        },
        {
          x: 2,
          y: 24,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 4,
          y: 25,
        },
        {
          x: 4,
          y: 24,
        },
        {
          x: 4,
          y: 23,
        },
        {
          x: 4,
          y: 22,
        },
        {
          x: 4,
          y: 21,
        },
        {
          x: 5,
          y: 21,
        },
        {
          x: 5,
          y: 22,
        },
        {
          x: 5,
          y: 23,
        },
        {
          x: 5,
          y: 24,
        },
        {
          x: 5,
          y: 25,
        },
        {
          x: 5,
          y: 26,
        },
        {
          x: 4,
          y: 26,
        },
        {
          x: 3,
          y: 26,
        },
        {
          x: 3,
          y: 25,
        },
      ],
      headDirection: "down",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 8,
          y: 27,
        },
        {
          x: 8,
          y: 28,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 10,
          y: 27,
        },
        {
          x: 9,
          y: 27,
        },
        {
          x: 9,
          y: 26,
        },
        {
          x: 10,
          y: 26,
        },
        {
          x: 11,
          y: 26,
        },
        {
          x: 11,
          y: 27,
        },
        {
          x: 11,
          y: 28,
        },
        {
          x: 10,
          y: 28,
        },
        {
          x: 9,
          y: 28,
        },
      ],
      headDirection: "left",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 12,
          y: 30,
        },
        {
          x: 12,
          y: 29,
        },
        {
          x: 12,
          y: 28,
        },
        {
          x: 12,
          y: 27,
        },
        {
          x: 12,
          y: 26,
        },
        {
          x: 12,
          y: 25,
        },
        {
          x: 11,
          y: 25,
        },
        {
          x: 10,
          y: 25,
        },
        {
          x: 9,
          y: 25,
        },
        {
          x: 8,
          y: 25,
        },
        {
          x: 7,
          y: 25,
        },
        {
          x: 7,
          y: 24,
        },
        {
          x: 8,
          y: 24,
        },
        {
          x: 9,
          y: 24,
        },
        {
          x: 10,
          y: 24,
        },
        {
          x: 11,
          y: 24,
        },
      ],
      headDirection: "right",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 8,
          y: 26,
        },
        {
          x: 7,
          y: 26,
        },
        {
          x: 6,
          y: 26,
        },
        {
          x: 6,
          y: 25,
        },
        {
          x: 6,
          y: 24,
        },
        {
          x: 6,
          y: 23,
        },
        {
          x: 6,
          y: 22,
        },
        {
          x: 6,
          y: 21,
        },
        {
          x: 7,
          y: 21,
        },
        {
          x: 8,
          y: 21,
        },
        {
          x: 9,
          y: 21,
        },
        {
          x: 10,
          y: 21,
        },
        {
          x: 11,
          y: 21,
        },
        {
          x: 11,
          y: 22,
        },
        {
          x: 11,
          y: 23,
        },
      ],
      headDirection: "up",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 9,
          y: 23,
        },
        {
          x: 8,
          y: 23,
        },
        {
          x: 7,
          y: 23,
        },
        {
          x: 7,
          y: 22,
        },
        {
          x: 8,
          y: 22,
        },
        {
          x: 9,
          y: 22,
        },
        {
          x: 10,
          y: 22,
        },
        {
          x: 10,
          y: 23,
        },
      ],
      headDirection: "up",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 22,
        },
        {
          x: 15,
          y: 22,
        },
        {
          x: 14,
          y: 22,
        },
        {
          x: 13,
          y: 22,
        },
        {
          x: 12,
          y: 22,
        },
        {
          x: 12,
          y: 21,
        },
        {
          x: 12,
          y: 20,
        },
        {
          x: 12,
          y: 19,
        },
        {
          x: 12,
          y: 18,
        },
        {
          x: 12,
          y: 17,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 14,
          y: 21,
        },
        {
          x: 14,
          y: 20,
        },
        {
          x: 14,
          y: 19,
        },
        {
          x: 13,
          y: 19,
        },
        {
          x: 13,
          y: 20,
        },
        {
          x: 13,
          y: 21,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 18,
        },
        {
          x: 16,
          y: 18,
        },
        {
          x: 16,
          y: 19,
        },
        {
          x: 15,
          y: 19,
        },
      ],
      headDirection: "left",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 26,
        },
        {
          x: 17,
          y: 25,
        },
        {
          x: 17,
          y: 24,
        },
        {
          x: 17,
          y: 23,
        },
        {
          x: 17,
          y: 22,
        },
        {
          x: 18,
          y: 22,
        },
        {
          x: 19,
          y: 22,
        },
        {
          x: 20,
          y: 22,
        },
        {
          x: 21,
          y: 22,
        },
        {
          x: 22,
          y: 22,
        },
        {
          x: 23,
          y: 22,
        },
      ],
      headDirection: "right",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 19,
          y: 24,
        },
        {
          x: 19,
          y: 25,
        },
        {
          x: 20,
          y: 25,
        },
        {
          x: 21,
          y: 25,
        },
        {
          x: 22,
          y: 25,
        },
        {
          x: 23,
          y: 25,
        },
      ],
      headDirection: "right",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 20,
          y: 24,
        },
        {
          x: 21,
          y: 24,
        },
        {
          x: 22,
          y: 24,
        },
        {
          x: 23,
          y: 24,
        },
        {
          x: 24,
          y: 24,
        },
        {
          x: 24,
          y: 25,
        },
        {
          x: 24,
          y: 26,
        },
        {
          x: 23,
          y: 26,
        },
        {
          x: 22,
          y: 26,
        },
        {
          x: 21,
          y: 26,
        },
        {
          x: 20,
          y: 26,
        },
        {
          x: 19,
          y: 26,
        },
        {
          x: 18,
          y: 26,
        },
        {
          x: 18,
          y: 25,
        },
        {
          x: 18,
          y: 24,
        },
        {
          x: 18,
          y: 23,
        },
        {
          x: 19,
          y: 23,
        },
        {
          x: 20,
          y: 23,
        },
        {
          x: 21,
          y: 23,
        },
        {
          x: 22,
          y: 23,
        },
        {
          x: 23,
          y: 23,
        },
      ],
      headDirection: "right",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 26,
        },
        {
          x: 25,
          y: 25,
        },
        {
          x: 25,
          y: 24,
        },
        {
          x: 25,
          y: 23,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 23,
        },
        {
          x: 24,
          y: 22,
        },
        {
          x: 25,
          y: 22,
        },
        {
          x: 26,
          y: 22,
        },
        {
          x: 26,
          y: 23,
        },
        {
          x: 26,
          y: 24,
        },
        {
          x: 26,
          y: 25,
        },
        {
          x: 26,
          y: 26,
        },
        {
          x: 26,
          y: 27,
        },
        {
          x: 25,
          y: 27,
        },
        {
          x: 24,
          y: 27,
        },
        {
          x: 23,
          y: 27,
        },
        {
          x: 22,
          y: 27,
        },
        {
          x: 21,
          y: 27,
        },
        {
          x: 21,
          y: 28,
        },
        {
          x: 21,
          y: 29,
        },
      ],
      headDirection: "up",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 27,
          y: 26,
        },
        {
          x: 27,
          y: 25,
        },
        {
          x: 28,
          y: 25,
        },
        {
          x: 28,
          y: 26,
        },
        {
          x: 28,
          y: 27,
        },
      ],
      headDirection: "up",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 18,
          y: 21,
        },
        {
          x: 17,
          y: 21,
        },
        {
          x: 16,
          y: 21,
        },
        {
          x: 15,
          y: 21,
        },
        {
          x: 15,
          y: 20,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 18,
          y: 19,
        },
        {
          x: 19,
          y: 19,
        },
        {
          x: 20,
          y: 19,
        },
        {
          x: 21,
          y: 19,
        },
        {
          x: 22,
          y: 19,
        },
        {
          x: 23,
          y: 19,
        },
        {
          x: 23,
          y: 20,
        },
        {
          x: 22,
          y: 20,
        },
        {
          x: 21,
          y: 20,
        },
        {
          x: 20,
          y: 20,
        },
        {
          x: 19,
          y: 20,
        },
        {
          x: 18,
          y: 20,
        },
        {
          x: 17,
          y: 20,
        },
        {
          x: 17,
          y: 19,
        },
        {
          x: 17,
          y: 18,
        },
        {
          x: 17,
          y: 17,
        },
        {
          x: 16,
          y: 17,
        },
        {
          x: 15,
          y: 17,
        },
        {
          x: 14,
          y: 17,
        },
        {
          x: 13,
          y: 17,
        },
        {
          x: 13,
          y: 18,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 19,
        },
        {
          x: 24,
          y: 20,
        },
      ],
      headDirection: "up",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 20,
        },
        {
          x: 25,
          y: 19,
        },
        {
          x: 25,
          y: 18,
        },
      ],
      headDirection: "down",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 15,
        },
        {
          x: 24,
          y: 14,
        },
      ],
      headDirection: "down",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 24,
          y: 16,
        },
        {
          x: 24,
          y: 17,
        },
        {
          x: 24,
          y: 18,
        },
        {
          x: 23,
          y: 18,
        },
        {
          x: 22,
          y: 18,
        },
        {
          x: 21,
          y: 18,
        },
        {
          x: 20,
          y: 18,
        },
        {
          x: 19,
          y: 18,
        },
        {
          x: 18,
          y: 18,
        },
        {
          x: 18,
          y: 17,
        },
        {
          x: 18,
          y: 16,
        },
        {
          x: 18,
          y: 15,
        },
        {
          x: 18,
          y: 14,
        },
        {
          x: 18,
          y: 13,
        },
        {
          x: 19,
          y: 13,
        },
        {
          x: 20,
          y: 13,
        },
        {
          x: 21,
          y: 13,
        },
        {
          x: 22,
          y: 13,
        },
        {
          x: 23,
          y: 13,
        },
        {
          x: 24,
          y: 13,
        },
      ],
      headDirection: "right",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 20,
          y: 16,
        },
        {
          x: 20,
          y: 15,
        },
        {
          x: 21,
          y: 15,
        },
        {
          x: 22,
          y: 15,
        },
        {
          x: 22,
          y: 16,
        },
        {
          x: 22,
          y: 17,
        },
        {
          x: 21,
          y: 17,
        },
        {
          x: 20,
          y: 17,
        },
        {
          x: 19,
          y: 17,
        },
        {
          x: 19,
          y: 16,
        },
        {
          x: 19,
          y: 15,
        },
        {
          x: 19,
          y: 14,
        },
        {
          x: 20,
          y: 14,
        },
        {
          x: 21,
          y: 14,
        },
        {
          x: 22,
          y: 14,
        },
        {
          x: 23,
          y: 14,
        },
        {
          x: 23,
          y: 15,
        },
        {
          x: 23,
          y: 16,
        },
        {
          x: 23,
          y: 17,
        },
      ],
      headDirection: "up",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 14,
        },
        {
          x: 16,
          y: 14,
        },
        {
          x: 16,
          y: 15,
        },
        {
          x: 15,
          y: 15,
        },
        {
          x: 14,
          y: 15,
        },
        {
          x: 14,
          y: 14,
        },
        {
          x: 14,
          y: 13,
        },
        {
          x: 15,
          y: 13,
        },
        {
          x: 16,
          y: 13,
        },
        {
          x: 17,
          y: 13,
        },
        {
          x: 17,
          y: 14,
        },
        {
          x: 17,
          y: 15,
        },
        {
          x: 17,
          y: 16,
        },
        {
          x: 16,
          y: 16,
        },
        {
          x: 15,
          y: 16,
        },
        {
          x: 14,
          y: 16,
        },
        {
          x: 13,
          y: 16,
        },
        {
          x: 12,
          y: 16,
        },
        {
          x: 12,
          y: 15,
        },
        {
          x: 12,
          y: 14,
        },
        {
          x: 12,
          y: 13,
        },
        {
          x: 12,
          y: 12,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 19,
          y: 21,
        },
        {
          x: 20,
          y: 21,
        },
        {
          x: 21,
          y: 21,
        },
        {
          x: 22,
          y: 21,
        },
        {
          x: 23,
          y: 21,
        },
        {
          x: 24,
          y: 21,
        },
        {
          x: 25,
          y: 21,
        },
        {
          x: 26,
          y: 21,
        },
        {
          x: 26,
          y: 20,
        },
        {
          x: 26,
          y: 19,
        },
        {
          x: 26,
          y: 18,
        },
        {
          x: 26,
          y: 17,
        },
        {
          x: 26,
          y: 16,
        },
        {
          x: 26,
          y: 15,
        },
        {
          x: 26,
          y: 14,
        },
      ],
      headDirection: "down",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 17,
        },
        {
          x: 25,
          y: 16,
        },
        {
          x: 25,
          y: 15,
        },
        {
          x: 25,
          y: 14,
        },
        {
          x: 25,
          y: 13,
        },
        {
          x: 26,
          y: 13,
        },
        {
          x: 27,
          y: 13,
        },
      ],
      headDirection: "right",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 27,
          y: 14,
        },
        {
          x: 27,
          y: 15,
        },
        {
          x: 27,
          y: 16,
        },
        {
          x: 27,
          y: 17,
        },
        {
          x: 27,
          y: 18,
        },
        {
          x: 27,
          y: 19,
        },
        {
          x: 27,
          y: 20,
        },
        {
          x: 27,
          y: 21,
        },
        {
          x: 27,
          y: 22,
        },
        {
          x: 27,
          y: 23,
        },
        {
          x: 27,
          y: 24,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 28,
          y: 14,
        },
        {
          x: 28,
          y: 15,
        },
        {
          x: 28,
          y: 16,
        },
        {
          x: 28,
          y: 17,
        },
      ],
      headDirection: "up",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 28,
          y: 18,
        },
        {
          x: 28,
          y: 19,
        },
        {
          x: 28,
          y: 20,
        },
        {
          x: 28,
          y: 21,
        },
        {
          x: 28,
          y: 22,
        },
        {
          x: 28,
          y: 23,
        },
        {
          x: 28,
          y: 24,
        },
      ],
      headDirection: "up",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 29,
          y: 27,
        },
        {
          x: 29,
          y: 26,
        },
        {
          x: 29,
          y: 25,
        },
        {
          x: 29,
          y: 24,
        },
        {
          x: 29,
          y: 23,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 26,
        },
        {
          x: 32,
          y: 27,
        },
        {
          x: 31,
          y: 27,
        },
        {
          x: 30,
          y: 27,
        },
        {
          x: 30,
          y: 26,
        },
        {
          x: 30,
          y: 25,
        },
        {
          x: 30,
          y: 24,
        },
        {
          x: 30,
          y: 23,
        },
      ],
      headDirection: "down",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 25,
        },
        {
          x: 31,
          y: 25,
        },
        {
          x: 31,
          y: 26,
        },
      ],
      headDirection: "up",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 24,
        },
        {
          x: 32,
          y: 23,
        },
        {
          x: 32,
          y: 22,
        },
        {
          x: 32,
          y: 21,
        },
        {
          x: 33,
          y: 21,
        },
        {
          x: 34,
          y: 21,
        },
        {
          x: 35,
          y: 21,
        },
        {
          x: 35,
          y: 22,
        },
        {
          x: 35,
          y: 23,
        },
        {
          x: 35,
          y: 24,
        },
        {
          x: 35,
          y: 25,
        },
      ],
      headDirection: "up",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 34,
          y: 22,
        },
        {
          x: 34,
          y: 23,
        },
        {
          x: 34,
          y: 24,
        },
        {
          x: 34,
          y: 25,
        },
        {
          x: 34,
          y: 26,
        },
        {
          x: 35,
          y: 26,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 31,
          y: 24,
        },
        {
          x: 31,
          y: 23,
        },
        {
          x: 31,
          y: 22,
        },
        {
          x: 31,
          y: 21,
        },
        {
          x: 31,
          y: 20,
        },
        {
          x: 32,
          y: 20,
        },
        {
          x: 33,
          y: 20,
        },
        {
          x: 34,
          y: 20,
        },
        {
          x: 35,
          y: 20,
        },
        {
          x: 36,
          y: 20,
        },
        {
          x: 36,
          y: 21,
        },
        {
          x: 36,
          y: 22,
        },
        {
          x: 36,
          y: 23,
        },
        {
          x: 36,
          y: 24,
        },
        {
          x: 36,
          y: 25,
        },
        {
          x: 36,
          y: 26,
        },
        {
          x: 37,
          y: 26,
        },
      ],
      headDirection: "right",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 37,
          y: 22,
        },
        {
          x: 37,
          y: 23,
        },
        {
          x: 37,
          y: 24,
        },
        {
          x: 37,
          y: 25,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 37,
          y: 21,
        },
        {
          x: 38,
          y: 21,
        },
        {
          x: 39,
          y: 21,
        },
      ],
      headDirection: "right",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 38,
          y: 20,
        },
        {
          x: 37,
          y: 20,
        },
        {
          x: 37,
          y: 19,
        },
        {
          x: 37,
          y: 18,
        },
        {
          x: 37,
          y: 17,
        },
        {
          x: 37,
          y: 16,
        },
        {
          x: 37,
          y: 15,
        },
        {
          x: 38,
          y: 15,
        },
        {
          x: 38,
          y: 16,
        },
        {
          x: 38,
          y: 17,
        },
        {
          x: 39,
          y: 17,
        },
        {
          x: 39,
          y: 16,
        },
        {
          x: 39,
          y: 15,
        },
      ],
      headDirection: "down",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 39,
          y: 18,
        },
        {
          x: 39,
          y: 19,
        },
        {
          x: 38,
          y: 19,
        },
        {
          x: 38,
          y: 18,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 36,
          y: 19,
        },
        {
          x: 35,
          y: 19,
        },
        {
          x: 35,
          y: 18,
        },
        {
          x: 36,
          y: 18,
        },
      ],
      headDirection: "right",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 36,
          y: 16,
        },
        {
          x: 36,
          y: 17,
        },
        {
          x: 35,
          y: 17,
        },
        {
          x: 35,
          y: 16,
        },
        {
          x: 35,
          y: 15,
        },
        {
          x: 36,
          y: 15,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 30,
          y: 20,
        },
        {
          x: 30,
          y: 21,
        },
        {
          x: 30,
          y: 22,
        },
        {
          x: 29,
          y: 22,
        },
        {
          x: 29,
          y: 21,
        },
        {
          x: 29,
          y: 20,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 32,
          y: 15,
        },
        {
          x: 33,
          y: 15,
        },
        {
          x: 34,
          y: 15,
        },
        {
          x: 34,
          y: 16,
        },
        {
          x: 34,
          y: 17,
        },
        {
          x: 34,
          y: 18,
        },
        {
          x: 34,
          y: 19,
        },
        {
          x: 33,
          y: 19,
        },
        {
          x: 32,
          y: 19,
        },
        {
          x: 31,
          y: 19,
        },
        {
          x: 30,
          y: 19,
        },
        {
          x: 29,
          y: 19,
        },
        {
          x: 29,
          y: 18,
        },
        {
          x: 29,
          y: 17,
        },
        {
          x: 29,
          y: 16,
        },
        {
          x: 29,
          y: 15,
        },
        {
          x: 29,
          y: 14,
        },
        {
          x: 30,
          y: 14,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 33,
          y: 16,
        },
        {
          x: 33,
          y: 17,
        },
        {
          x: 33,
          y: 18,
        },
        {
          x: 32,
          y: 18,
        },
        {
          x: 32,
          y: 17,
        },
        {
          x: 32,
          y: 16,
        },
      ],
      headDirection: "down",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 30,
          y: 15,
        },
        {
          x: 30,
          y: 16,
        },
        {
          x: 30,
          y: 17,
        },
        {
          x: 30,
          y: 18,
        },
        {
          x: 31,
          y: 18,
        },
        {
          x: 31,
          y: 17,
        },
        {
          x: 31,
          y: 16,
        },
        {
          x: 31,
          y: 15,
        },
        {
          x: 31,
          y: 14,
        },
        {
          x: 32,
          y: 14,
        },
        {
          x: 33,
          y: 14,
        },
        {
          x: 33,
          y: 13,
        },
        {
          x: 33,
          y: 12,
        },
        {
          x: 33,
          y: 11,
        },
        {
          x: 33,
          y: 10,
        },
      ],
      headDirection: "down",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 36,
          y: 12,
        },
        {
          x: 36,
          y: 13,
        },
        {
          x: 35,
          y: 13,
        },
        {
          x: 35,
          y: 12,
        },
      ],
      headDirection: "down",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 35,
          y: 11,
        },
        {
          x: 36,
          y: 11,
        },
        {
          x: 37,
          y: 11,
        },
        {
          x: 37,
          y: 12,
        },
        {
          x: 37,
          y: 13,
        },
        {
          x: 37,
          y: 14,
        },
        {
          x: 36,
          y: 14,
        },
        {
          x: 35,
          y: 14,
        },
        {
          x: 34,
          y: 14,
        },
        {
          x: 34,
          y: 13,
        },
        {
          x: 34,
          y: 12,
        },
        {
          x: 34,
          y: 11,
        },
      ],
      headDirection: "down",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 39,
          y: 11,
        },
        {
          x: 39,
          y: 12,
        },
        {
          x: 39,
          y: 13,
        },
        {
          x: 39,
          y: 14,
        },
        {
          x: 38,
          y: 14,
        },
        {
          x: 38,
          y: 13,
        },
        {
          x: 38,
          y: 12,
        },
        {
          x: 38,
          y: 11,
        },
        {
          x: 38,
          y: 10,
        },
        {
          x: 37,
          y: 10,
        },
        {
          x: 36,
          y: 10,
        },
        {
          x: 35,
          y: 10,
        },
        {
          x: 34,
          y: 10,
        },
      ],
      headDirection: "left",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 36,
          y: 9,
        },
        {
          x: 35,
          y: 9,
        },
        {
          x: 34,
          y: 9,
        },
        {
          x: 33,
          y: 9,
        },
        {
          x: 33,
          y: 8,
        },
        {
          x: 34,
          y: 8,
        },
        {
          x: 35,
          y: 8,
        },
      ],
      headDirection: "right",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 31,
          y: 12,
        },
        {
          x: 32,
          y: 12,
        },
        {
          x: 32,
          y: 13,
        },
        {
          x: 31,
          y: 13,
        },
        {
          x: 30,
          y: 13,
        },
        {
          x: 30,
          y: 12,
        },
        {
          x: 30,
          y: 11,
        },
        {
          x: 31,
          y: 11,
        },
        {
          x: 32,
          y: 11,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 31,
          y: 9,
        },
        {
          x: 31,
          y: 8,
        },
        {
          x: 32,
          y: 8,
        },
        {
          x: 32,
          y: 9,
        },
        {
          x: 32,
          y: 10,
        },
        {
          x: 31,
          y: 10,
        },
        {
          x: 30,
          y: 10,
        },
        {
          x: 30,
          y: 9,
        },
        {
          x: 30,
          y: 8,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 29,
          y: 11,
        },
        {
          x: 29,
          y: 10,
        },
        {
          x: 29,
          y: 9,
        },
        {
          x: 29,
          y: 8,
        },
        {
          x: 29,
          y: 7,
        },
        {
          x: 30,
          y: 7,
        },
        {
          x: 31,
          y: 7,
        },
        {
          x: 32,
          y: 7,
        },
        {
          x: 33,
          y: 7,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 28,
          y: 8,
        },
        {
          x: 28,
          y: 9,
        },
        {
          x: 28,
          y: 10,
        },
        {
          x: 28,
          y: 11,
        },
        {
          x: 28,
          y: 12,
        },
        {
          x: 28,
          y: 13,
        },
        {
          x: 29,
          y: 13,
        },
        {
          x: 29,
          y: 12,
        },
      ],
      headDirection: "down",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 29,
          y: 5,
        },
        {
          x: 29,
          y: 6,
        },
        {
          x: 30,
          y: 6,
        },
        {
          x: 31,
          y: 6,
        },
      ],
      headDirection: "right",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 11,
        },
        {
          x: 26,
          y: 11,
        },
        {
          x: 27,
          y: 11,
        },
      ],
      headDirection: "right",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 26,
          y: 12,
        },
        {
          x: 25,
          y: 12,
        },
        {
          x: 24,
          y: 12,
        },
        {
          x: 23,
          y: 12,
        },
        {
          x: 23,
          y: 11,
        },
      ],
      headDirection: "down",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 11,
        },
        {
          x: 21,
          y: 11,
        },
        {
          x: 20,
          y: 11,
        },
        {
          x: 19,
          y: 11,
        },
        {
          x: 19,
          y: 12,
        },
        {
          x: 20,
          y: 12,
        },
        {
          x: 21,
          y: 12,
        },
        {
          x: 22,
          y: 12,
        },
      ],
      headDirection: "right",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 18,
          y: 11,
        },
        {
          x: 18,
          y: 12,
        },
        {
          x: 17,
          y: 12,
        },
        {
          x: 16,
          y: 12,
        },
        {
          x: 15,
          y: 12,
        },
        {
          x: 14,
          y: 12,
        },
        {
          x: 13,
          y: 12,
        },
        {
          x: 13,
          y: 13,
        },
        {
          x: 13,
          y: 14,
        },
        {
          x: 13,
          y: 15,
        },
      ],
      headDirection: "up",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 11,
        },
        {
          x: 16,
          y: 11,
        },
        {
          x: 15,
          y: 11,
        },
        {
          x: 14,
          y: 11,
        },
      ],
      headDirection: "left",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 18,
          y: 10,
        },
        {
          x: 17,
          y: 10,
        },
        {
          x: 16,
          y: 10,
        },
        {
          x: 15,
          y: 10,
        },
        {
          x: 14,
          y: 10,
        },
        {
          x: 13,
          y: 10,
        },
        {
          x: 13,
          y: 11,
        },
      ],
      headDirection: "up",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 4,
        },
        {
          x: 26,
          y: 4,
        },
        {
          x: 27,
          y: 4,
        },
        {
          x: 28,
          y: 4,
        },
        {
          x: 28,
          y: 5,
        },
        {
          x: 28,
          y: 6,
        },
        {
          x: 28,
          y: 7,
        },
      ],
      headDirection: "up",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 25,
          y: 3,
        },
        {
          x: 26,
          y: 3,
        },
      ],
      headDirection: "right",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 26,
          y: 6,
        },
        {
          x: 26,
          y: 7,
        },
        {
          x: 26,
          y: 8,
        },
        {
          x: 26,
          y: 9,
        },
        {
          x: 25,
          y: 9,
        },
        {
          x: 25,
          y: 8,
        },
        {
          x: 25,
          y: 7,
        },
        {
          x: 25,
          y: 6,
        },
        {
          x: 25,
          y: 5,
        },
        {
          x: 26,
          y: 5,
        },
        {
          x: 27,
          y: 5,
        },
        {
          x: 27,
          y: 6,
        },
        {
          x: 27,
          y: 7,
        },
        {
          x: 27,
          y: 8,
        },
        {
          x: 27,
          y: 9,
        },
        {
          x: 27,
          y: 10,
        },
        {
          x: 26,
          y: 10,
        },
        {
          x: 25,
          y: 10,
        },
        {
          x: 24,
          y: 10,
        },
      ],
      headDirection: "left",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 6,
        },
        {
          x: 23,
          y: 6,
        },
        {
          x: 23,
          y: 7,
        },
        {
          x: 23,
          y: 8,
        },
        {
          x: 22,
          y: 8,
        },
        {
          x: 21,
          y: 8,
        },
        {
          x: 20,
          y: 8,
        },
        {
          x: 19,
          y: 8,
        },
        {
          x: 18,
          y: 8,
        },
        {
          x: 18,
          y: 7,
        },
        {
          x: 18,
          y: 6,
        },
        {
          x: 18,
          y: 5,
        },
        {
          x: 19,
          y: 5,
        },
        {
          x: 20,
          y: 5,
        },
        {
          x: 21,
          y: 5,
        },
        {
          x: 22,
          y: 5,
        },
        {
          x: 23,
          y: 5,
        },
        {
          x: 24,
          y: 5,
        },
        {
          x: 24,
          y: 6,
        },
        {
          x: 24,
          y: 7,
        },
        {
          x: 24,
          y: 8,
        },
        {
          x: 24,
          y: 9,
        },
        {
          x: 23,
          y: 9,
        },
        {
          x: 22,
          y: 9,
        },
        {
          x: 21,
          y: 9,
        },
        {
          x: 20,
          y: 9,
        },
        {
          x: 19,
          y: 9,
        },
        {
          x: 18,
          y: 9,
        },
      ],
      headDirection: "left",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 22,
          y: 7,
        },
        {
          x: 21,
          y: 7,
        },
        {
          x: 20,
          y: 7,
        },
        {
          x: 19,
          y: 7,
        },
        {
          x: 19,
          y: 6,
        },
        {
          x: 20,
          y: 6,
        },
        {
          x: 21,
          y: 6,
        },
      ],
      headDirection: "right",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 9,
        },
        {
          x: 16,
          y: 9,
        },
      ],
      headDirection: "left",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 15,
          y: 9,
        },
        {
          x: 14,
          y: 9,
        },
        {
          x: 13,
          y: 9,
        },
        {
          x: 12,
          y: 9,
        },
        {
          x: 12,
          y: 8,
        },
        {
          x: 12,
          y: 7,
        },
        {
          x: 12,
          y: 6,
        },
        {
          x: 12,
          y: 5,
        },
        {
          x: 12,
          y: 4,
        },
        {
          x: 13,
          y: 4,
        },
        {
          x: 14,
          y: 4,
        },
        {
          x: 15,
          y: 4,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 5,
        },
        {
          x: 16,
          y: 5,
        },
        {
          x: 16,
          y: 4,
        },
        {
          x: 17,
          y: 4,
        },
      ],
      headDirection: "right",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 7,
        },
        {
          x: 15,
          y: 7,
        },
        {
          x: 14,
          y: 7,
        },
        {
          x: 14,
          y: 6,
        },
        {
          x: 15,
          y: 6,
        },
        {
          x: 16,
          y: 6,
        },
        {
          x: 17,
          y: 6,
        },
        {
          x: 17,
          y: 7,
        },
        {
          x: 17,
          y: 8,
        },
        {
          x: 16,
          y: 8,
        },
        {
          x: 15,
          y: 8,
        },
        {
          x: 14,
          y: 8,
        },
        {
          x: 13,
          y: 8,
        },
        {
          x: 13,
          y: 7,
        },
        {
          x: 13,
          y: 6,
        },
        {
          x: 13,
          y: 5,
        },
        {
          x: 14,
          y: 5,
        },
        {
          x: 15,
          y: 5,
        },
      ],
      headDirection: "right",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 14,
          y: 3,
        },
        {
          x: 15,
          y: 3,
        },
        {
          x: 16,
          y: 3,
        },
      ],
      headDirection: "right",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 17,
          y: 2,
        },
        {
          x: 17,
          y: 3,
        },
        {
          x: 18,
          y: 3,
        },
        {
          x: 18,
          y: 4,
        },
        {
          x: 19,
          y: 4,
        },
        {
          x: 20,
          y: 4,
        },
        {
          x: 21,
          y: 4,
        },
        {
          x: 21,
          y: 3,
        },
        {
          x: 22,
          y: 3,
        },
        {
          x: 22,
          y: 4,
        },
        {
          x: 23,
          y: 4,
        },
        {
          x: 23,
          y: 3,
        },
        {
          x: 24,
          y: 3,
        },
        {
          x: 24,
          y: 2,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 2,
        },
        {
          x: 22,
          y: 2,
        },
        {
          x: 21,
          y: 2,
        },
      ],
      headDirection: "left",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 20,
          y: 3,
        },
        {
          x: 20,
          y: 2,
        },
      ],
      headDirection: "down",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 23,
          y: 10,
        },
        {
          x: 22,
          y: 10,
        },
        {
          x: 21,
          y: 10,
        },
        {
          x: 20,
          y: 10,
        },
      ],
      headDirection: "left",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 16,
          y: 1,
        },
        {
          x: 17,
          y: 1,
        },
      ],
      headDirection: "right",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 5,
        },
        {
          x: 11,
          y: 6,
        },
        {
          x: 10,
          y: 6,
        },
      ],
      headDirection: "left",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 9,
        },
        {
          x: 11,
          y: 10,
        },
        {
          x: 12,
          y: 10,
        },
        {
          x: 12,
          y: 11,
        },
        {
          x: 11,
          y: 11,
        },
        {
          x: 10,
          y: 11,
        },
        {
          x: 10,
          y: 10,
        },
        {
          x: 10,
          y: 9,
        },
        {
          x: 9,
          y: 9,
        },
        {
          x: 8,
          y: 9,
        },
      ],
      headDirection: "left",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 9,
          y: 10,
        },
        {
          x: 8,
          y: 10,
        },
      ],
      headDirection: "left",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 9,
          y: 11,
        },
        {
          x: 8,
          y: 11,
        },
        {
          x: 7,
          y: 11,
        },
        {
          x: 7,
          y: 10,
        },
        {
          x: 7,
          y: 9,
        },
      ],
      headDirection: "down",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 7,
          y: 7,
        },
        {
          x: 8,
          y: 7,
        },
        {
          x: 9,
          y: 7,
        },
        {
          x: 10,
          y: 7,
        },
        {
          x: 11,
          y: 7,
        },
        {
          x: 11,
          y: 8,
        },
        {
          x: 10,
          y: 8,
        },
        {
          x: 9,
          y: 8,
        },
        {
          x: 8,
          y: 8,
        },
        {
          x: 7,
          y: 8,
        },
        {
          x: 6,
          y: 8,
        },
      ],
      headDirection: "left",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 6,
          y: 11,
        },
        {
          x: 6,
          y: 10,
        },
        {
          x: 6,
          y: 9,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 19,
        },
        {
          x: 11,
          y: 20,
        },
        {
          x: 10,
          y: 20,
        },
        {
          x: 9,
          y: 20,
        },
        {
          x: 8,
          y: 20,
        },
        {
          x: 7,
          y: 20,
        },
        {
          x: 6,
          y: 20,
        },
        {
          x: 6,
          y: 19,
        },
        {
          x: 6,
          y: 18,
        },
      ],
      headDirection: "down",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 8,
          y: 18,
        },
        {
          x: 9,
          y: 18,
        },
        {
          x: 10,
          y: 18,
        },
        {
          x: 10,
          y: 19,
        },
        {
          x: 9,
          y: 19,
        },
        {
          x: 8,
          y: 19,
        },
        {
          x: 7,
          y: 19,
        },
        {
          x: 7,
          y: 18,
        },
      ],
      headDirection: "down",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 13,
        },
        {
          x: 10,
          y: 13,
        },
      ],
      headDirection: "left",
      color: 16737894,
    },
    {
      waypoints: [
        {
          x: 11,
          y: 14,
        },
        {
          x: 11,
          y: 15,
        },
        {
          x: 11,
          y: 16,
        },
        {
          x: 11,
          y: 17,
        },
        {
          x: 10,
          y: 17,
        },
        {
          x: 9,
          y: 17,
        },
        {
          x: 8,
          y: 17,
        },
        {
          x: 7,
          y: 17,
        },
        {
          x: 6,
          y: 17,
        },
        {
          x: 6,
          y: 16,
        },
        {
          x: 6,
          y: 15,
        },
        {
          x: 6,
          y: 14,
        },
        {
          x: 6,
          y: 13,
        },
        {
          x: 6,
          y: 12,
        },
        {
          x: 7,
          y: 12,
        },
        {
          x: 8,
          y: 12,
        },
        {
          x: 9,
          y: 12,
        },
        {
          x: 10,
          y: 12,
        },
        {
          x: 11,
          y: 12,
        },
      ],
      headDirection: "right",
      color: 3381759,
    },
    {
      waypoints: [
        {
          x: 10,
          y: 14,
        },
        {
          x: 10,
          y: 15,
        },
        {
          x: 10,
          y: 16,
        },
        {
          x: 9,
          y: 16,
        },
        {
          x: 9,
          y: 15,
        },
        {
          x: 9,
          y: 14,
        },
        {
          x: 9,
          y: 13,
        },
      ],
      headDirection: "down",
      color: 6743654,
    },
    {
      waypoints: [
        {
          x: 7,
          y: 13,
        },
        {
          x: 7,
          y: 14,
        },
        {
          x: 7,
          y: 15,
        },
        {
          x: 7,
          y: 16,
        },
        {
          x: 8,
          y: 16,
        },
        {
          x: 8,
          y: 15,
        },
        {
          x: 8,
          y: 14,
        },
        {
          x: 8,
          y: 13,
        },
      ],
      headDirection: "down",
      color: 16763955,
    },
    {
      waypoints: [
        {
          x: 5,
          y: 8,
        },
        {
          x: 5,
          y: 9,
        },
        {
          x: 5,
          y: 10,
        },
        {
          x: 5,
          y: 11,
        },
        {
          x: 5,
          y: 12,
        },
        {
          x: 4,
          y: 12,
        },
        {
          x: 4,
          y: 11,
        },
      ],
      headDirection: "down",
      color: 16755234,
    },
    {
      waypoints: [
        {
          x: 4,
          y: 15,
        },
        {
          x: 4,
          y: 16,
        },
        {
          x: 4,
          y: 17,
        },
        {
          x: 4,
          y: 18,
        },
        {
          x: 4,
          y: 19,
        },
        {
          x: 4,
          y: 20,
        },
        {
          x: 5,
          y: 20,
        },
        {
          x: 5,
          y: 19,
        },
        {
          x: 5,
          y: 18,
        },
        {
          x: 5,
          y: 17,
        },
        {
          x: 5,
          y: 16,
        },
        {
          x: 5,
          y: 15,
        },
        {
          x: 5,
          y: 14,
        },
        {
          x: 5,
          y: 13,
        },
      ],
      headDirection: "down",
      color: 13395711,
    },
    {
      waypoints: [
        {
          x: 4,
          y: 14,
        },
        {
          x: 4,
          y: 13,
        },
      ],
      headDirection: "down",
      color: 16750899,
    },
    {
      waypoints: [
        {
          x: 4,
          y: 9,
        },
        {
          x: 4,
          y: 10,
        },
        {
          x: 3,
          y: 10,
        },
        {
          x: 2,
          y: 10,
        },
      ],
      headDirection: "left",
      color: 3401189,
    },
    {
      waypoints: [
        {
          x: 3,
          y: 24,
        },
        {
          x: 3,
          y: 23,
        },
        {
          x: 3,
          y: 22,
        },
        {
          x: 3,
          y: 21,
        },
        {
          x: 3,
          y: 20,
        },
        {
          x: 3,
          y: 19,
        },
        {
          x: 3,
          y: 18,
        },
        {
          x: 3,
          y: 17,
        },
        {
          x: 3,
          y: 16,
        },
        {
          x: 3,
          y: 15,
        },
        {
          x: 2,
          y: 15,
        },
        {
          x: 2,
          y: 14,
        },
        {
          x: 2,
          y: 13,
        },
        {
          x: 3,
          y: 13,
        },
        {
          x: 3,
          y: 12,
        },
        {
          x: 2,
          y: 12,
        },
        {
          x: 2,
          y: 11,
        },
        {
          x: 1,
          y: 11,
        },
      ],
      headDirection: "left",
      color: 16744652,
    },
    {
      waypoints: [
        {
          x: 1,
          y: 26,
        },
        {
          x: 2,
          y: 26,
        },
        {
          x: 2,
          y: 25,
        },
        {
          x: 1,
          y: 25,
        },
        {
          x: 1,
          y: 24,
        },
        {
          x: 1,
          y: 23,
        },
        {
          x: 1,
          y: 22,
        },
        {
          x: 1,
          y: 21,
        },
        {
          x: 2,
          y: 21,
        },
        {
          x: 2,
          y: 20,
        },
        {
          x: 2,
          y: 19,
        },
        {
          x: 1,
          y: 19,
        },
        {
          x: 1,
          y: 18,
        },
        {
          x: 1,
          y: 17,
        },
        {
          x: 2,
          y: 17,
        },
        {
          x: 2,
          y: 16,
        },
        {
          x: 1,
          y: 16,
        },
        {
          x: 1,
          y: 15,
        },
        {
          x: 1,
          y: 14,
        },
        {
          x: 1,
          y: 13,
        },
        {
          x: 1,
          y: 12,
        },
      ],
      headDirection: "down",
      color: 16737894,
    },
  ],
};

export default devLevel;
