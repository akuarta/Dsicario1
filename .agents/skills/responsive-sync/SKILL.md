---
name: responsive-sync
description: Prevents mobile UI changes from breaking web layout in React Native + Expo Web projects. Enforces cross-platform visual consistency.
---

# Responsive Sync: Mobile-Web Visual Consistency

## Objective
Ensure any UI change made for mobile (iOS/Android) visualization preserves and respects the web desktop layout intact, and vice versa. This applies to React Native + Expo Web projects using `react-native-web`.

## Critical Rules

### 1. PLATFORM-AWARE MODIFICATIONS
- ALWAYS use `Platform.OS` checks when applying platform-specific styles.
- NEVER apply `position: 'fixed'` or `position: 'absolute'` globally without platform wrapping.
- Example:
```javascript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: { overflow: 'auto' },
      default: { overflow: 'visible' }
    })
  }
});
```

### 2. PRESERVE SCROLL BEHAVIOR
- NEVER set `overflow: 'hidden'` on parent containers without platform-specific checks.
- NEVER set `pointerEvents: 'none'` on scrollable areas.
- ALWAYS test that `ScrollView` and `FlatList` work on both platforms after any layout change.

### 3. RESPONSIVE BREAKPOINTS
- Use `useWindowDimensions()` instead of `Dimensions.get()` for real-time responsive layouts.
- Define breakpoints consistently:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Web/Desktop: > 1024px
- NEVER hardcode pixel values for positioning without `Platform.select()`.

### 4. COMPONENT ISOLATION
- Mobile-specific components (hamburger menus, bottom sheets, floating buttons) MUST be wrapped in `Platform.select()` or separate files.
- Web-specific components (hover effects, sidebars) MUST NOT render on mobile without platform checks.

### 5. STYLE OVERRIDE SAFETY
- When modifying styles, ALWAYS preserve existing platform-specific behavior.
- NEVER overwrite `StyleSheet` objects completely - use spread operator to merge:
```javascript
// WRONG
const styles = { container: { padding: 10 } };

// CORRECT
const styles = StyleSheet.create({
  container: {
    ...existingStyles.container,
    padding: 10
  }
});
```

### 6. NAVIGATION CONSIDERATIONS
- Drawer navigators behave differently on web vs mobile. NEVER assume drawer is always visible on web.
- Bottom tabs MUST use `Platform.select()` for safe area handling.
- Modal presentations differ: web uses overlays, mobile uses native modals.

## Output Validation Checklist
Before delivering any UI change, verify:
1. Does this change affect ONLY the target platform?
2. Will scroll behavior work on both mobile and web?
3. Are there any hardcoded dimensions that break on other screen sizes?
4. Did I use `Platform.select()` or `Platform.OS` for platform-specific code?
5. Will this trigger a regression in existing functionality?

## Pattern Examples

### Floating Element (Safe)
```javascript
const FloatingButton = () => (
  <View style={styles.container}>
    <TouchableOpacity style={styles.button}>
      <Text>Action</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: {
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      },
      default: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        // Respect safe area on mobile
      }
    })
  }
});
```

### Scroll Container (Safe)
```javascript
<ScrollView
  style={styles.scrollContainer}
  contentContainerStyle={styles.content}
>
  {children}
</ScrollView>

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  content: {
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflow: 'auto',
      },
      default: {
        paddingBottom: 100,
      }
    })
  }
});
```

## Common Pitfalls to Avoid
- Using `window` object without `Platform.OS === 'web'` check (crashes on native)
- Using `document` or `navigator` without platform checks
- Setting `height: '100vh'` on mobile (use `flex: 1` instead)
- Using CSS-in-JS libraries that don't support `Platform.select()`
- Forgetting that `hover` states don't exist on touch devices
