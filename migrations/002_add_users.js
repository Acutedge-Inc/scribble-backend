// migrations/20250119-add-user.js
module.exports = {
  async up(db) {
    await db.collection("user").insertOne({
      username: "new_user",
      email: "newuser@example.com",
      password: "securepassword123",
      createdAt: new Date(),
    });
  },

  async down(db) {
    await db.collection("user").deleteOne({ username: "new_user" });
  },
};
