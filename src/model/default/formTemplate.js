module.exports = [
  {
    name: "Start of Care",
    assessmentForm: [
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
      },
      {
        question_code: "GG0100.A",
        question:
          "Indicate the patient's usual ability with everyday activities prior to the current illness, exacerbation, or injury. - Code the patient's need for assistance with bathing, dressing, using the toilet, and eating prior to the current illness, exacerbation, or injury.",
        options: [
          "3. Independent - Patient completed all the activities by themself, with or without an assistive device, with no assistance from a helper.",
          "2. Needed Some Help - Patient needed partial assistance from another person to complete any activities.",
          "1. Dependent - A helper completed all the activities for the patient.",
          "8. Unknown",
          "9. Not Applicable",
        ],
      },
      {
        question_code: "GG0100.B",
        question:
          "Indicate the patient's usual ability with everyday activities prior to the current illness, exacerbation, or injury. - Code the patient's need for assistance with walking from room to room (with or without a device such as cane, crutch or walker) prior to the current illness, exacerbation, or injury.",
        options: [
          "3. Independent - Patient completed all the activities by themself, with or without an assistive device, with no assistance from a helper.",
          "2. Needed Some Help - Patient needed partial assistance from another person to complete any activities.",
          "1. Dependent - A helper completed all the activities for the patient.",
          "8. Unknown",
          "9. Not Applicable",
        ],
      },
      {
        question_code: "GG0100.C",
        question:
          "Indicate the patient's usual ability with everyday activities prior to the current illness, exacerbation, or injury. - Code the patient's need for assistance with internal or external stairs (with or without a device such as cane, crutch, or walker) prior to the current illness, exacerbation or injury.",
        options: [
          "3. Independent - Patient completed all the activities by themself, with or without an assistive device, with no assistance from a helper.",
          "2. Needed Some Help - Patient needed partial assistance from another person to complete any activities.",
          "1. Dependent - A helper completed all the activities for the patient.",
          "8. Unknown",
          "9. Not Applicable",
        ],
      },
      {
        question_code: "GG0100.D",
        question:
          "Indicate the patient's usual ability with everyday activities prior to the current illness, exacerbation, or injury. - Code the patient's need for assistance with planning regular tasks, such as shopping or remembering to take medication prior to the current illness, exacerbation, or injury.",
        options: [
          "3. Independent - Patient completed all the activities by themself, with or without an assistive device, with no assistance from a helper.",
          "2. Needed Some Help - Patient needed partial assistance from another person to complete any activities.",
          "1. Dependent - A helper completed all the activities for the patient.",
          "8. Unknown",
          "9. Not Applicable",
        ],
      },
      {
        question_code: "GG0110",
        question:
          "Indicate devices and aids used by the patient prior to the current illness, exacerbation, or injury.",
        options: [
          "A. Manual wheelchair",
          "B. Motorized wheelchair and/or scooter",
          "C. Mechanical lift",
          "D. Walker",
          "E. Orthotics/Prosthetics",
          "Z. None of the above",
        ],
      },
    ],
  },
];
