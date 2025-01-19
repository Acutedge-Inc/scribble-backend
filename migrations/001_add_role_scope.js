// migrations/20250119-add-roles-and-scopes.js
module.exports = {
  async up(db) {
    await db.collection("role").insertMany([
      {
        name: "Admin",
        description: "Administrator role with full access",
        createdAt: new Date(),
      },
      {
        name: "User",
        description: "Standard user role with limited access",
        createdAt: new Date(),
      },
      {
        name: "Guest",
        description: "Guest role with minimal access",
        createdAt: new Date(),
      },
    ]);

    await db.collection("scope").insertMany([
      {
        name: "read",
        description: "Read access to resources",
        createdAt: new Date(),
      },
      {
        name: "write",
        description: "Write access to resources",
        createdAt: new Date(),
      },
      {
        name: "delete",
        description: "Delete access to resources",
        createdAt: new Date(),
      },
    ]);
  },

  async down(db) {
    await db.collection("role").deleteMany({});
    await db.collection("scope").deleteMany({});
  },
};
