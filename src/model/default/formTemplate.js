module.exports = [
  {
    name: "Start of Care",
    assessmentForm: [
      {
        question_code: "A1110.A",
        question:
          "Do you have any other active health conditions that we should be aware of?",
        options: [
          "1. Peripheral Vascular Disease (PVD) or Peripheral Arterial Disease (PAD)",
          "2. Diabetes Mellitus (DM)",
          "3. None of the above",
        ],
        section: "Administrative",
      },
      {
        question_code: "A1110.B",
        question:
          "Do you need or want an interpreter to communicate with a doctor or health care staff?",
        options: [
          "0. No incontinence or catheter (includes anuria or ostomy for urinary drainage)",
          "1. Yes",
          "9. Unable to determine",
        ],
        section: "Administrative",
      },
      {
        question_code: "B0200",
        question:
          "Do you have difficulty hearing in a normal conversation, when socializing, or watching TV?",
        options: [
          "0. Adequate - no difficulty in normal conversation, social interaction, listening to TV",
          "1. Minimal difficult - difficulty in some environments (e.g., when person speaks softly, or setting is noisy)",
          "2. Moderate difficulty - speaker has to increase volume and speak distinctly",
          "3. Highly impaired - absence of useful hearing",
        ],
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "B1000",
        question:
          "Can you see fine details, like regular print in newspapers or books?",
        options: [
          "0. Adequate - sees fine detail, such as regular print in newspapers/books",
          "1. Impaired - sees large print, but not regular print in newspapers/books",
          "2. Moderately impaired - limited vision; not able to see newspaper headlines but can identify objects",
          "3. Highly impaired - object identification in question, but eyes appear to follow objects",
          "4. Severely impaired - no vision or sees only light, colors or shapes; eyes do not appear to follow objects",
        ],
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "B1300",
        question:
          "How often do you need to have someone help you when you read instructions, pamphlets, or other written material from your doctor or pharmacy?",
        options: [
          "0. Never",
          "1. Rarely",
          "2. Sometimes",
          "3. Often",
          "4. Always",
          "7. Patient declines to respond",
          "8. Patient unable to respond",
        ],
        section: "Hearing, Speech and Vision",
      },
      {
        question_code: "C0300.A",
        question:
          "Please tell me what year it is right now. - Able to report correct year",
        options: [
          "0. Missed by > 5 years or no answer",
          "1. Missed by 2-5 years",
          "2. Missed by 1 year",
          "3. Correct",
        ],
        section: "Cognitive Patterns",
      },
      {
        question_code: "C0300.B",
        question:
          "What month are we in right now? - Able to report correct month",
        options: [
          "0. Missed by > 5 months or no answer",
          "1. Missed by 2-5 months",
          "2. Missed by 1 month",
          "3. Correct",
        ],
        section: "Cognitive Patterns",
      },
      {
        question_code: "C0300.C",
        question: "What day of the week is it? - Able to report correct day",
        options: [
          "0. Missed by > 2 days or no answer",
          "1. Missed by 1 day",
          "2. Correct",
        ],
        section: "Cognitive Patterns",
      },
      {
        question_code: "M1740",
        question:
          "Do you have any behavioral issues that we should be aware of?",
        options: ["0. No", "1. Yes"],
        section: "Behavior",
      },
      {
        question_code: "M1800",
        question: "How would you rate your overall functional status?",
        options: [
          "0. Independent",
          "1. Some assistance needed",
          "2. Dependent",
        ],
        section: "Functional Status",
      },
      {
        question_code: "M1860",
        question: "Do you have any mobility issues?",
        options: ["0. No", "1. Yes"],
        section: "Functional Status",
      },
      {
        question_code: "M1610",
        question: "Do you have any issues with bladder or bowel control?",
        options: ["0. No", "1. Yes"],
        section: "Bladder and Bowel",
      },
      {
        question_code: "M1028",
        question: "Are you currently taking any medications?",
        options: ["0. No", "1. Yes"],
        section: "Medications",
      },
    ],
  },
];
