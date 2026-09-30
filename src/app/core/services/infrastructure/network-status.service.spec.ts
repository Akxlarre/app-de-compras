import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkStatusService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('arranca con el estado del navegador', () => {
    expect(service.online()).toBe(true);
  });

  it('sigue los eventos offline / online de window', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBe(true);
  });

  it('un fallo de red marca sin conexión y una petición exitosa lo revierte', () => {
    service.reportNetworkFailure();
    expect(service.online()).toBe(false);
    service.reportSuccess();
    expect(service.online()).toBe(true);
  });
});
