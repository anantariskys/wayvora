export type UserRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};
