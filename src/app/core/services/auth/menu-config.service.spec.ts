import { TestBed } from '@angular/core/testing';
import { MenuConfigService } from './menu-config.service';
import { AuthFacade } from '@core/facades/auth.facade';
import { signal } from '@angular/core';

const mockAuthFacade = {
  currentUser: signal(null),
};

describe('MenuConfigService', () => {
  let service: MenuConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MenuConfigService,
        { provide: AuthFacade, useValue: mockAuthFacade },
      ],
    });

    service = TestBed.inject(MenuConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
