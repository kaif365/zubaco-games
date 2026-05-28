import type * as React from "react";
import { useContext } from "react";
import type { UserContextValue } from "./types";
import {
  UserContext as CustomUserContext,
  UserProvider,
} from "./user-provider";

const createUserContext = (): {
  UserContext: React.Context<UserContextValue | undefined>;
} => {
  return { UserContext: CustomUserContext };
};

const { UserContext } = createUserContext();

const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

export { UserContext, UserProvider, useUser };
