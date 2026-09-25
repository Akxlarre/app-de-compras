export interface AppUpdate {
  id: string;
  version: string;
  build_number: number;
  release_notes: string;
  force_update: boolean;
  apk_path: string;
  app_target: string;
  created_at: string;
}
