module.exports = {
  "post/api/v1/auth/login": ["email", "password"],
  "post/api/v1/auth/tenant": ["tenantName"],
  "post/api/v1/auth/user": ["email", "firstName", "employeeId", "roleId"],
  "post/api/v1/auth/change-password": ["newPassword", "oldPassword"],
  "get/api/v1/setting/gridView": ["gridName"],
};
