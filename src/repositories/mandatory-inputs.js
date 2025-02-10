module.exports = {
  "post/api/v1/auth/login": ["email", "password"],
  "post/api/v1/auth/tenant": ["tenantName"],
  "post/api/v1/auth/register": [
    "email",
    "roleId",
    "name",
    "contact",
    "x-tenant-id",
  ],
  "post/api/v1/auth/change-password": ["newPassword", "oldPassword"],
};
