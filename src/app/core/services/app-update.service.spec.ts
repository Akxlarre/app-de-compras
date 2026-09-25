import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppUpdateService } from './app-update.service';
import { SupabaseService } from './infrastructure/supabase.service';

describe('AppUpdateService', () => {
  let service: AppUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AppUpdateService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(),
              storage: { from: vi.fn() }
            }
          }
        }
      ]
    });
    service = TestBed.inject(AppUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
