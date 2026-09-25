import { TestBed } from '@angular/core/testing';
import { SearchPanelFacadeService } from './search-panel.service';

describe('SearchPanelFacadeService', () => {
  let service: SearchPanelFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchPanelFacadeService],
    });

    service = TestBed.inject(SearchPanelFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
