import { TestBed } from '@angular/core/testing';

import { PixelBoardService } from './pixel-board.service';

describe('PixelBoardService', () => {
  let service: PixelBoardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PixelBoardService);
  });

  it('starts with a blank board', () => {
    expect(service.colors().length).toBe(service.size * service.size);
    expect(service.colors().every((color) => color === '#FFFFFF')).toBe(true);
    expect(service.lastPainted()).toBeNull();
  });

  it('paints at the row-major index matching the coordinates', () => {
    service.selectColor('#E50000');
    service.paint(3, 2);

    expect(service.colors()[2 * service.size + 3]).toBe('#E50000');
    expect(service.colors().filter((color) => color === '#E50000').length).toBe(1);
  });

  it('records the last painted pixel', () => {
    service.selectColor('#0083C7');
    service.paint(15, 15);

    expect(service.lastPainted()).toEqual({ x: 15, y: 15, color: '#0083C7' });
  });

  it('paints with the most recently selected color', () => {
    service.selectColor('#E50000');
    service.selectColor('#94E044');
    service.paint(0, 0);

    expect(service.colors()[0]).toBe('#94E044');
  });

  it('overwrites an already painted pixel', () => {
    service.selectColor('#E50000');
    service.paint(1, 1);
    service.selectColor('#222222');
    service.paint(1, 1);

    expect(service.colors()[service.size + 1]).toBe('#222222');
  });
});
