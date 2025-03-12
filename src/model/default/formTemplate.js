module.exports = [
  {
    name: "Start of Care",
    assessmentForm: [
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
        value: 0,
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
        value: 2,
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
        value: 3,
      },
    ],
  },
];
