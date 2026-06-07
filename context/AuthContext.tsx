// import React, { createContext, useContext, useEffect, useState } from 'react';
// import * as SecureStore from 'expo-secure-store';

// type AuthContextType = {
//   isLoggedIn: boolean;
//   login: () => void;
//   logout: () => void;
//   loading: boolean;
// };

// const AuthContext = createContext<AuthContextType | null>(null);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [loading, setLoading] = useState(true);

//   // load saved login state on app start
//   useEffect(() => {
//     const loadAuth = async () => {
//       const token = await SecureStore.getItemAsync('token');

//       if (token) {
//         setIsLoggedIn(true);
//       }

//       setLoading(false);
//     };

//     loadAuth();
//   }, []);

//   const login = async () => {
//     await SecureStore.setItemAsync('token', 'demo-token');
//     setIsLoggedIn(true);
//   };

//   const logout = async () => {
//     await SecureStore.deleteItemAsync('token');
//     setIsLoggedIn(false);
//   };

//   return (
//     <AuthContext.Provider value={{ isLoggedIn, login, logout, loading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
//   return ctx;
// }