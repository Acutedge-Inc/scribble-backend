module.exports = {
  "post/api/v1/auth/login": [
    {
      input: "email",
      isInvalid: (input) => typeof input !== "string",
      messageOnValidationFail: "email is invalid",
    },
    {
      input: "password",
      isInvalid: (input) => typeof input !== "string",
      messageOnValidationFail: "password is invalid",
    },
  ],
};
