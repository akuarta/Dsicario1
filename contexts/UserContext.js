import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useState('Usuario');
  const [email, setEmail] = useState('usuario@dsicario.com');

  return (
    <UserContext.Provider value={{ username, setUsername, email, setEmail }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
