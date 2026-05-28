import type { StageInstructionContent } from "@/types/instruction-content";

export const instructionStageContent: StageInstructionContent = {
  gameLabel: "गेम {stage}",
  statusLabel: "सक्रिय",
  gameTitle: "मेज़ नेविगेशन",
  slides: [
    {
      id: "description",
      title: "गेम विवरण",
      description:
        "ठंडी मेज़ में टिमटिमाती लौ को मार्ग दिखाएँ। समय समाप्त होने से पहले लक्ष्य तक पहुँचें। तीर, WASD या स्वाइप से चलें।",
      items: [
        {
          id: "observe",
          title: "देखें",
          description: "मेज़ का लेआउट समझें और रास्ता तय करें।",
          variant: "step",
        },
        {
          id: "move",
          title: "चलें",
          description: "जंक्शन पर सही दिशा चुनें।",
          variant: "step",
        },
        {
          id: "goal",
          title: "लक्ष्य तक पहुँचें",
          description: "लौ बुझने से पहले निकास ढूँढें।",
          variant: "step",
        },
        {
          id: "progress",
          title: "प्रगति",
          description: "बोर्ड पूरे करें; स्कोर और गिनती आपकी प्रगति दिखाती है।",
          variant: "step",
        },
      ],
    },
    {
      id: "scoring",
      title: "स्कोरिंग नियम",
      description: "आपका प्रदर्शन कैसे मापा जाता है।",
      items: [
        {
          id: "boards",
          title: "पूरे बोर्ड",
          description: "हर हल बोर्ड आपकी स्टेज प्रगति में गिनता है।",
          variant: "step",
        },
        {
          id: "score",
          title: "स्कोर",
          description: "अंक दक्षता से जुड़े हैं।",
          variant: "step",
        },
        {
          id: "time",
          title: "समय",
          description: "घड़ी खत्म होने से पहले तेज़ी से खेलें।",
          variant: "step",
        },
        {
          id: "mistakes",
          title: "गलतियाँ",
          description: "गलत चाल से समय और स्कोर प्रभावित होता है।",
          variant: "step",
        },
        {
          id: "stage",
          title: "स्टेज परिणाम",
          description: "अंतिम परिणाम बोर्ड, स्कोर और समय से बनता है।",
          variant: "step",
        },
      ],
    },
    {
      id: "anti-cheat",
      title: "निष्पक्ष खेल नियम",
      description: "निम्न कार्यों से स्वचालित अयोग्यता हो सकती है:",
      items: [
        {
          id: "switch",
          title: "टेस्ट के दौरान ऐप बदलना या ब्राउज़र छोटा करना",
          description: "",
          variant: "rule",
        },
        {
          id: "patterns",
          title: "संदिग्ध प्रतिक्रिया पैटर्न",
          description: "",
          variant: "rule",
        },
        {
          id: "tools",
          title: "बाहरी सहायता का उपयोग",
          description: "",
          variant: "rule",
        },
        {
          id: "accounts",
          title: "कई खातों से प्रयास",
          description: "",
          variant: "rule",
        },
        {
          id: "automation",
          title: "बॉट या स्क्रिप्ट का उपयोग",
          description: "",
          variant: "rule",
        },
      ],
    },
  ],
};
