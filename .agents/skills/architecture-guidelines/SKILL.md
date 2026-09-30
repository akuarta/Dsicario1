---
name: architecture-guidelines
description: Enforces clean architecture patterns, SOLID principles, and project structure for React Native + Expo apps.
---

# Architecture Guidelines Skill

## Objective
Maintain consistent, scalable, and testable architecture following SOLID principles and clean code patterns.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Generic (Button, Input, Card)
│   └── features/        # Feature-specific
├── screens/             # Screen components
├── navigation/          # Navigation configuration
├── hooks/               # Custom hooks
├── contexts/            # React contexts
├── services/            # API calls, external services
├── utils/               # Pure helper functions
├── constants/           # App-wide constants
├── types/               # TypeScript types
├── config/              # Environment config
└── assets/              # Images, fonts, etc.
```

## SOLID Principles

### 1. Single Responsibility (SRP)
Each component/function does ONE thing:

```javascript
// BAD - Does too much
const UserScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('api/user')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, []);
  
  return loading ? <Spinner /> : <View>{user.name}</View>;
};

// GOOD - Separated concerns
const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    userService.getUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);
  
  return { user, loading };
};

const UserScreen = () => {
  const { user, loading } = useUser();
  return loading ? <Spinner /> : <UserProfile user={user} />;
};
```

### 2. Open/Closed (OCP)
Open for extension, closed for modification:

```javascript
// BAD - Must modify to add new button types
const Button = ({ type, ...props }) => {
  if (type === 'primary') return <PrimaryBtn {...props} />;
  if (type === 'secondary') return <SecondaryBtn {...props} />;
  // Must add more if statements for each new type
};

// GOOD - Extend without modifying
const BUTTON_VARIANTS = {
  primary: PrimaryBtn,
  secondary: SecondaryBtn,
  outline: OutlineBtn,
};

const Button = ({ variant = 'primary', ...props }) => {
  const Variant = BUTTON_VARIANTS[variant] || PrimaryBtn;
  return <Variant {...props} />;
};
```

### 3. Liskov Substitution (LSP)
Interchangeable components:

```javascript
// Both can be used anywhere a Button is expected
const PrimaryButton = ({ onPress, children }) => (
  <TouchableOpacity onPress={onPress} style={styles.primary}>
    <Text>{children}</Text>
  </TouchableOpacity>
);

const IconButton = ({ onPress, icon }) => (
  <TouchableOpacity onPress={onPress} style={styles.icon}>
    <Icon name={icon} />
  </TouchableOpacity>
);
```

### 4. Interface Segregation (ISP)
Small, focused interfaces:

```javascript
// BAD - Too many props
const UserCard = ({ name, email, avatar, bio, followers, following, posts, onFollow, onMessage, onBlock }) => { ... };

// GOOD - Composed from small pieces
const UserCard = ({ user, actions }) => (
  <Card>
    <UserAvatar uri={user.avatar} />
    <UserInfo name={user.name} email={user.email} />
    <UserStats followers={user.followers} following={user.following} />
    <UserActions onFollow={actions.onFollow} onMessage={actions.onMessage} />
  </Card>
);
```

### 5. Dependency Inversion (DIP)
Depend on abstractions, not concretions:

```javascript
// BAD - Direct dependency on Firebase
const fetchUsers = async () => {
  const snapshot = await firebase.firestore().collection('users').get();
  return snapshot.docs.map(doc => doc.data());
};

// GOOD - Abstracted service
// services/userService.js
export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
};

// hooks/useUsers.js
import { userService } from '../services/userService';

const fetchUsers = async () => {
  return userService.getAll();
};
```

## Component Design Patterns

### Container/Presentational Split
```javascript
// containers/UserListContainer.js (logic)
export const UserListContainer = () => {
  const { users, loading, error } = useUsers();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <UserList users={users} />;
};

// components/UserList.js (UI only)
export const UserList = ({ users }) => (
  <FlatList
    data={users}
    renderItem={({ item }) => <UserCard user={item} />}
    keyExtractor={item => item.id}
  />
);
```

### Custom Hooks for Logic
```javascript
// hooks/useForm.js
export const useForm = (initialValues, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  
  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const handleSubmit = (onSubmit) => () => {
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    } else {
      setErrors(validationErrors);
    }
  };
  
  return { values, errors, handleChange, handleSubmit };
};
```

## Anti-Patterns to Avoid
- God components (1000+ lines)
- Prop drilling beyond 3 levels
- Mutating props or state directly
- Inline styles everywhere
- Business logic in components
- Direct API calls in components
- Magic numbers/strings
- Circular dependencies

## File Naming Conventions
```
ComponentName.js       # PascalCase for components
useHookName.js         # camelCase with 'use' prefix
helperFunction.js      # camelCase for utilities
ComponentName.test.js  # Test file matches source
constants.js           # camelCase for constants
```
