import { TestBed } from '@angular/core/testing';
import { LayoutDrawerService } from './layout-drawer.service';

describe('LayoutDrawerService', () => {
  let service: LayoutDrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LayoutDrawerService],
    });

    service = TestBed.inject(LayoutDrawerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
