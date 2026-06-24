export type UserStatus = "active" | "inactive" | "suspended" | "flagged";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  gamesPlayed: number;
  status: UserStatus;
  joinDate: string;
  lastActive: string;
}
