import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BreadcrumbService } from './breadcrumb.service';
import { MenuConfigService } from '../auth/menu-config.service';
import { signal } from '@angular/core';

import { Subject } from 'rxjs';

const mockRouter = { events: new Subject() };
const mockMenuConfigService = { getItems: vi.fn().mockReturnValue(signal([])) };

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        { provide: Router, useValue: mockRouter },
        { provide: MenuConfigService, useValue: mockMenuConfigService },
      ],
    });

    service = TestBed.inject(BreadcrumbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
