import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const native = vi.hoisted(() => ({
  isNative: false,
  writeFile: vi.fn(),
  open: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.isNative },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: native.writeFile },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor-community/file-opener', () => ({
  FileOpener: { open: native.open },
}));

import { FileExportService } from './file-export.service';

describe('FileExportService (spec 0026 D4)', () => {
  let service: FileExportService;

  beforeEach(() => {
    native.isNative = false;
    native.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/compras-2026-10.csv' });
    native.open.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [FileExportService] });
    service = TestBed.inject(FileExportService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('en el navegador descarga el archivo con su nombre', async () => {
    const created = vi.fn().mockReturnValue('blob:x');
    const revoked = vi.fn();
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await service.saveCsv('compras-2026-10.csv', 'a;b\r\n');

    const blob = created.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('compras-2026-10.csv');
    expect(anchor.href).toBe('blob:x');
    expect(revoked).toHaveBeenCalledWith('blob:x');
    expect(native.writeFile).not.toHaveBeenCalled();
  });

  it('en el teléfono lo escribe en el cache y lo abre con una app de planillas', async () => {
    native.isNative = true;

    await service.saveCsv('compras-2026-10.csv', 'a;b\r\n');

    expect(native.writeFile).toHaveBeenCalledWith({
      path: 'compras-2026-10.csv',
      data: 'a;b\r\n',
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(native.open).toHaveBeenCalledWith({
      filePath: 'file:///cache/compras-2026-10.csv',
      contentType: 'text/csv',
    });
  });

  it('si no hay app para abrirlo, el error sube (el facade avisa)', async () => {
    native.isNative = true;
    native.open.mockRejectedValue(new Error('No app'));
    await expect(service.saveCsv('x.csv', '')).rejects.toThrow('No app');
  });
});
