const hasRoleAccess = (user, itemRoles = []) => {
  if (!itemRoles || itemRoles.length === 0) return true;

  if (!user || !user.roles) return false;

  // استفاده از role_names که در AuthContext پردازش شده
  const userRoles = user.role_names || user.roles?.map((role) =>
    typeof role === "object" ? role.name : role
  ) || [];

  return itemRoles.some((role) => userRoles.includes(role));
};

const hasPermissionAccess = (user, itemPermissions = []) => {
  if (!itemPermissions || itemPermissions.length === 0) return true;

  if (!user) return false;

  // ✅ اگر کاربر ادمین است، همه پرمیشن‌ها را دارد
  if (user.isAdmin === true) {
    return true;
  }

  // permissions مستقیم
  const directPermissions =
    user.permissions?.map((perm) =>
      typeof perm === "object" ? perm.name : perm
    ) || [];

  // permissions از طریق roles
  let rolePermissions = [];

  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((role) => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((perm) => {
          const permName =
            typeof perm === "object" ? perm.name : perm;

          if (!rolePermissions.includes(permName)) {
            rolePermissions.push(permName);
          }
        });
      }
    });
  }

  // استفاده از all_permissions که در AuthContext پردازش شده
  const allPermissions = user.all_permissions || [...directPermissions, ...rolePermissions];

  return itemPermissions.some((perm) =>
    allPermissions.includes(perm)
  );
};

const filterNavigationItems = (items, user) => {
  if (!items || !Array.isArray(items)) return [];
  if (!user) return [];

  return items.reduce((acc, item) => {
    const clonedItem = { ...item };

    const roleAccess = hasRoleAccess(user, clonedItem.roles);
    const permissionAccess = hasPermissionAccess(user, clonedItem.permissions);

    // اگر دسترسی ندارد، رد کن
    if (!roleAccess || !permissionAccess) {
      return acc;
    }

    // فیلتر کردن children
    if (clonedItem.children) {
      clonedItem.children = filterNavigationItems(
        clonedItem.children,
        user
      );

      // اگر children خالی شد و آیتم path ندارد، حذف کن
      if (
        clonedItem.children.length === 0 &&
        !clonedItem.path
      ) {
        return acc;
      }
    }

    acc.push(clonedItem);
    return acc;
  }, []);
};

export default filterNavigationItems;