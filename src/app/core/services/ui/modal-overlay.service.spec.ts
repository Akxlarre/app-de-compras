import { TestBed } from '@angular/core/testing';
import { ModalOverlayService } from './modal-overlay.service';

describe('ModalOverlayService', () => {
  let service: ModalOverlayService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModalOverlayService],
    });

    service = TestBed.inject(ModalOverlayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
