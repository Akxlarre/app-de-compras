import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import type { AppUpdate } from '@core/models/app-update.model';

/** Releases del APK: tabla `app_updates` + bucket público `releases`. */
@Injectable({ providedIn: 'root' })
export class AppUpdatesRepository {
  private readonly supabase = inject(SupabaseService);

  /** Última versión publicada para el target (ej. `'shop'`). Lanza el error de Supabase. */
  async findLatest(appTarget: string): Promise<AppUpdate | null> {
    const { data, error } = await this.supabase.client
      .from('app_updates')
      .select('*')
      .eq('app_target', appTarget)
      .order('build_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as AppUpdate | null) ?? null;
  }

  getApkPublicUrl(apkPath: string): string | null {
    const { data } = this.supabase.client.storage.from('releases').getPublicUrl(apkPath);
    return data?.publicUrl || null;
  }
}
