---
name: tdd-workflow
description: Enforces Test-Driven Development workflow. Write tests first, then implement, then refactor.
---

# TDD Workflow Skill

## Objective
Guide development through Test-Driven Development: write failing tests first, implement minimum code to pass, then refactor.

## The TDD Cycle (Red-Green-Refactor)

### Phase 1: RED (Write Failing Test)
- Write a test for the next small functionality
- Run the test - it MUST fail
- If test passes, the requirement was already met

### Phase 2: GREEN (Make Test Pass)
- Write minimum code to make the test pass
- Don't add extra features
- Run test again to confirm

### Phase 3: REFACTOR (Clean Up)
- Improve code structure while tests stay green
- Remove duplication
- Extract methods, rename for clarity
- Run tests to verify nothing broke

## Test Structure (Arrange-Act-Assert)

```javascript
describe('functionName', () => {
  it('should do expected behavior when condition', () => {
    // Arrange - setup test data
    const input = { /* test data */ };
    
    // Act - call the function
    const result = functionName(input);
    
    // Assert - verify result
    expect(result).toEqual(expectedOutput);
  });
});
```

## Testing Priorities for React Native

### 1. Unit Tests (Fast, Many)
- Pure functions (utils, helpers, calculations)
- State management logic
- Data transformations
- Validation functions

### 2. Component Tests (Medium)
- Rendering with different props
- Event handlers (press, input, scroll)
- Platform-specific behavior
- Conditional rendering

### 3. Integration Tests (Few, Slow)
- Navigation flows
- API calls with mocked responses
- Complex user interactions
- Form submissions

## Test Examples

### Testing a Utility Function
```javascript
// utils/math.js
export const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// utils/math.test.js
describe('calculateTotal', () => {
  it('should sum all item prices multiplied by quantity', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 }
    ];
    expect(calculateTotal(items)).toBe(35);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

### Testing a React Native Component
```javascript
import { render, fireEvent } from '@testing-library/react-native';
import { Counter } from './Counter';

describe('Counter', () => {
  it('should increment count when plus button pressed', () => {
    const { getByText, getByTestId } = render(<Counter />);
    
    expect(getByText('Count: 0')).toBeTruthy();
    
    fireEvent.press(getByTestId('plus-button'));
    
    expect(getByText('Count: 1')).toBeTruthy();
  });
});
```

### Testing Platform-Specific Code
```javascript
import { Platform } from 'react-native';

describe('getPlatformStyle', () => {
  beforeEach(() => {
    Platform.OS = 'web';
  });

  it('should return overflow auto on web', () => {
    expect(getPlatformStyle().overflow).toBe('auto');
  });

  it('should return overflow visible on native', () => {
    Platform.OS = 'ios';
    expect(getPlatformStyle().overflow).toBe('visible');
  });
});
```

## When to Use Each Test Type
| Scenario | Test Type | Example |
|----------|-----------|---------|
| Pure calculation | Unit | `calculateDiscount(price, percent)` |
| Component renders | Component | `<Button title="Save" />` |
| Form validation | Unit | `validateEmail(email)` |
| Button press | Component | `fireEvent.press(button)` |
| API call + UI update | Integration | Login flow |
| Navigation | Integration | Screen transitions |

## Red Flags (Need More Tests)
- Function has no tests
- Test only checks happy path
- Mocks are too complex
- Test name doesn't describe behavior
- Tests are order-dependent
