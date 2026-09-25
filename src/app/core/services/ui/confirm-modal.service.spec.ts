import { TestBed } from '@angular/core/testing';
import { ConfirmModalService } from './confirm-modal.service';

describe('ConfirmModalService', () => {
  let service: ConfirmModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfirmModalService],
    });

    service = TestBed.inject(ConfirmModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialze with isOpen false', () => {
    expect(service.isOpen()).toBe(false);
  });
});
