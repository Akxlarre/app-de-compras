export interface Family {
  id: string;
  name: string;
  created_at: string;
}

/** Lo que la UI muestra de la familia actual. */
export type FamilyInfo = Pick<Family, 'id' | 'name'>;

export type FamilyRole = 'owner' | 'member';

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  created_at: string;
}
