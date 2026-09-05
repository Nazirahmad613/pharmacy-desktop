// app/services/NavigationService.js
import navigationsData from "app/navigations";

class NavigationService {
  // دریافت تمام آیتم‌های قابل نمایش (با حذف آیتم‌های تکراری)
  static getUniqueNavigations() {
    return navigationsData.filter(item => 
      item.name && !item.type && !item.label
    );
  }

  // دریافت گروه‌های سطح بالا
  static getTopLevelGroups() {
    return this.getUniqueNavigations().filter(item => 
      (item.children && item.children.length > 0) || item.path
    );
  }

  // دریافت آیتم‌های دارای مسیر (برای سایدبار)
  static getNavigationItems() {
    const items = [];
    
    const processItems = (data, parent = null) => {
      data.forEach(item => {
        if (item.type === 'label') return;
        
        if (item.children && item.children.length > 0) {
          // اگر آیتم دارای فرزند است، به عنوان یک گروه در نظر گرفته می‌شود
          const groupItem = {
            ...item,
            children: []
          };
          
          // پردازش فرزندان
          const childItems = [];
          item.children.forEach(child => {
            if (child.children && child.children.length > 0) {
              // فرزندهای دارای زیرمجموعه
              const subGroup = {
                ...child,
                children: child.children.filter(c => c.path)
              };
              if (subGroup.children.length > 0) {
                childItems.push(subGroup);
              }
            } else if (child.path) {
              // آیتم‌های ساده با مسیر
              childItems.push(child);
            }
          });
          
          if (childItems.length > 0) {
            groupItem.children = childItems;
            items.push(groupItem);
          }
        } else if (item.path) {
          // آیتم‌های تکی با مسیر
          items.push(item);
        }
      });
    };
    
    processItems(navigationsData);
    return items;
  }

  // دریافت مسیر پیش‌فرض
  static getDefaultPath() {
    const defaultItem = navigationsData.find(item => 
      item.path && (item.name === 'dashboard' || item.name === 'Home')
    );
    return defaultItem?.path || '/material/dashboard';
  }

  // بررسی وجود مسیر
  static hasPath(item) {
    return item && (item.path || (item.children && item.children.some(child => child.path)));
  }

  // پیدا کردن آیتم بر اساس مسیر
  static findItemByPath(path) {
    if (!path) return null;

    const findInItems = (items) => {
      for (const item of items) {
        if (item.path === path) return item;
        if (item.children) {
          const found = findInItems(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInItems(navigationsData);
  }

  // دریافت breadcrumb برای مسیر
  static getBreadcrumbs(path) {
    const breadcrumbs = [];
    
    const findPath = (items, targetPath, parents = []) => {
      for (const item of items) {
        if (item.path === targetPath) {
          return [...parents, item];
        }
        if (item.children) {
          const found = findPath(item.children, targetPath, [...parents, item]);
          if (found) return found;
        }
      }
      return null;
    };

    const result = findPath(navigationsData, path);
    return result || [];
  }
}

export default NavigationService;