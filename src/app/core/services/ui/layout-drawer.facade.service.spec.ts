import { TestBed } from '@angular/core/testing';
import { LayoutDrawerFacadeService } from './layout-drawer.facade.service';
import { LayoutDrawerService } from './layout-drawer.service';

const mockLayoutDrawerService = {
  isOpen: vi.fn().mockReturnValue(false),
  open: vi.fn(),
  close: vi.fn(),
  toggle: vi.fn(),
};

describe('LayoutDrawerFacadeService', () => {
  let service: LayoutDrawerFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LayoutDrawerFacadeService,
        { provide: LayoutDrawerService, useValue: mockLayoutDrawerService },
      ],
    });

    service = TestBed.inject(LayoutDrawerFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
