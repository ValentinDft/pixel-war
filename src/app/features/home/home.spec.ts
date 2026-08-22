import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PixelBoardService } from '@core/services/pixel-board.service';
import { SupabaseService } from '@core/services/supabase.service';
import { createSupabaseMock } from '@core/mocks/supabase.mock';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let board: PixelBoardService;

  const status = (): HTMLElement =>
    fixture.debugElement.query(By.css('.home__status')).nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [{ provide: SupabaseService, useValue: createSupabaseMock().service }],
    }).compileComponents();

    board = TestBed.inject(PixelBoardService);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the live region mounted and empty while nothing failed', () => {
    expect(status().getAttribute('role')).toBe('status');
    expect(status().textContent?.trim()).toBe('');
  });

  it('shows the last error under the palette', async () => {
    board.lastError.set('Attends encore 3s avant de repeindre ce pixel.');
    await fixture.whenStable();

    expect(status().textContent?.trim()).toBe('Attends encore 3s avant de repeindre ce pixel.');
  });

  it('clears the message once the error is gone', async () => {
    board.lastError.set('Attends encore 3s avant de repeindre ce pixel.');
    await fixture.whenStable();

    board.lastError.set(null);
    await fixture.whenStable();

    expect(status().textContent?.trim()).toBe('');
  });
});
