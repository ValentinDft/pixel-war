import { DestroyRef, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { PostgrestError, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { PaintPixelArgs, PixelRow } from '@core/models/pixel.interface';
import { SupabaseService } from '@core/services/supabase.service';

const BOARD_SIZE = 16;
const EMPTY_COLOR = '#FFFFFF';
const DEFAULT_COLOR = '#94E044';
const COOLDOWN_ERROR = 'cooldown';

@Service()
export class PixelBoardService {
  private supabaseService = inject(SupabaseService);
  private destroyRef = inject(DestroyRef);

  public readonly size = BOARD_SIZE;

  public board = signal<readonly string[]>(
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => EMPTY_COLOR),
  );
  public currentColor = signal(DEFAULT_COLOR);
  public boardLoading = signal<boolean>(false);
  public lastError = signal<string | null>(null);

  private changes: Subscription | null = null;

  /**
   * Charge la grille persistée, puis reste à l'écoute des pixels posés par les
   * autres joueurs. Appelable plusieurs fois sans risque : l'abonnement temps
   * réel n'est créé qu'une seule fois.
   */
  public connect(): void {
    void this.loadBoard();

    this.changes ??= this.watchRemoteChanges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        this.onRemoteChange(payload);
      });
  }

  /** Définit la couleur que prendra le prochain pixel peint. */
  public selectColor(color: string): void {
    this.currentColor.set(color);
  }

  /**
   * Envoie le pixel à la fonction `paint_pixel'. La grille n'est pas modifiée
   * ici : c'est l'événement temps réel déclenché par l'écriture qui viendra
   * poser la couleur, pour tous les joueurs de la même façon. Les coordonnées
   * hors grille sont ignorées.
   */
  public paint(x: number, y: number): void {
    if (!this.isOnBoard(x, y)) {
      return;
    }

    this.lastError.set(null);

    void this.persist(x, y, this.currentColor());
  }

  /**
   * Récupère les pixels déjà enregistrés et les applique sur la grille vierge.
   * Les positions absentes de la table restent blanches.
   */
  private async loadBoard(): Promise<void> {
    this.boardLoading.set(true);

    const { data, error } = await this.supabaseService.client.from('pixels').select('x, y, color');

    this.boardLoading.set(false);

    if (error) {
      this.lastError.set('Impossible de charger la grille.');
      return;
    }

    const rows = (data ?? []) as PixelRow[];

    this.board.update((colors) => {
      const next = [...colors];

      for (const pixel of rows) {
        if (this.isOnBoard(pixel.x, pixel.y)) {
          next[pixel.y * BOARD_SIZE + pixel.x] = pixel.color;
        }
      }

      return next;
    });
  }

  /**
   * Enregistre le pixel en base. En cas de refus (cooldown de 5s, réseau), rien
   * n'est peint et l'erreur est traduite pour le joueur dans {@link lastError}.
   *
   * @param x Abscisse du pixel.
   * @param y Ordonnée du pixel.
   * @param color Couleur à enregistrer.
   */
  private async persist(x: number, y: number, color: string): Promise<void> {
    const args: PaintPixelArgs = { p_x: x, p_y: y, p_color: color };
    const { error } = await this.supabaseService.client.rpc('paint_pixel', args);

    if (error) {
      this.lastError.set(this.toMessage(error));
      return;
    }
  }

  /**
   * Encapsule le canal temps réel dans un observable, afin que sa fermeture —
   * et donc le retrait du canal — soit pilotée par `takeUntilDestroyed'.
   */
  private watchRemoteChanges(): Observable<RealtimePostgresChangesPayload<PixelRow>> {
    return new Observable<RealtimePostgresChangesPayload<PixelRow>>((subscriber) => {
      const channel = this.supabaseService.client
        .channel('pixels')
        .on<PixelRow>(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pixels' },
          (payload) => {
            subscriber.next(payload);
          },
        )
        .subscribe();

      return () => {
        void this.supabaseService.client.removeChannel(channel);
      };
    });
  }

  /**
   * Applique un pixel reçu du temps réel. La ligne est ignorée si elle est
   * incomplète (cas d'une suppression) ou hors des limites de la grille.
   */
  private onRemoteChange(payload: RealtimePostgresChangesPayload<PixelRow>): void {
    const row = payload.new;

    if (!('x' in row) || !('y' in row) || !('color' in row) || !this.isOnBoard(row.x, row.y)) {
      return;
    }

    this.applyColor(row.y * BOARD_SIZE + row.x, row.color);
  }

  /**
   * Colore une case de la grille. Le signal n'est pas réémis si la couleur est
   * déjà la bonne, ce qui évite un rendu inutile quand le temps réel nous
   * renvoie nos propres pixels.
   */
  private applyColor(index: number, color: string): void {
    this.board.update((colors) =>
      colors[index] === color
        ? colors
        : colors.map((current, i) => (i === index ? color : current)),
    );
  }

  /** Indique si les coordonnées tombent bien dans la grille. */
  private isOnBoard(x: number, y: number): boolean {
    return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
  }

  /**
   * Traduit une erreur Postgrest en message affichable. Le cooldown remonte le
   * nombre de secondes restantes dans le champ `details`.
   */
  private toMessage(error: PostgrestError): string {
    if (error.message !== COOLDOWN_ERROR) {
      return "Impossible d'enregistrer ce pixel.";
    }

    const seconds = Number(error.details);

    return Number.isFinite(seconds) && seconds > 0
      ? `Attends encore ${seconds}s avant de repeindre ce pixel.`
      : 'Attends quelques secondes avant de repeindre ce pixel.';
  }
}
