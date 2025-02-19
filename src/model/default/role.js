module.exports = [
  {
    roleName: "user",
    scope: [
      "assessment.read",
      "assessment.write",
      "assessment.remove",
      "answer.read",
      "answer.write",
      "answer.remove",
      "self.read",
      "self.write",
    ],
  },
  {
    roleName: "userAdmin",
    scope: [
      "admin.read",
      "admin.write",
      "admin.remove",
      "user.read",
      "user.write",
      "user.remove",
      "role.read",
      "role.write",
      "role.remove",
      "form.read",
      "form.write",
      "form.remove",
      "self.read",
      "self.write",
    ],
  },
];
