export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export type FamilyRole = 'owner' | 'member';

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  created_at: string;
}

/** Lo que la UI muestra de la familia actual. */
export interface FamilyInfo {
  id: string;
  name: string;
  /** Código de invitación sin formato (8 caracteres). */
  inviteCode: string;
  myRole: FamilyRole;
}

/** Miembro de mi familia (RPC `get_family_members`; nunca trae el email). */
export interface FamilyMemberView {
  userId: string;
  name: string;
  role: FamilyRole;
  joinedAt: string;
  isMe: boolean;
}

/** Familia a la que apunta un código, para confirmar antes de unirse. */
export interface FamilyPreview {
  name: string;
  memberCount: number;
}

export type JoinFamilyResult = 'joined' | 'invalid_code' | 'already_member' | 'error';
