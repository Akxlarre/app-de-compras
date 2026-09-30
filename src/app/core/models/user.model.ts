export type UserRole = 'admin' | 'member' | 'secretaria' | 'instructor' | 'alumno' | 'relator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  avatarUrl?: string;
  dbId?: string | number;
  firstLogin?: boolean;
  branchId?: string | number;
  isActive?: boolean;
}
// Iniciales: initialsOf() en core/utils/avatar.utils.ts.
