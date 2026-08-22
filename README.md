# Pixel War

Grille collaborative 16×16 : chaque joueur pose des pixels, et tout le monde voit les
changements en direct. Angular 22 côté client, Supabase (Postgres + Realtime) côté serveur.

Un pixel donné ne peut être repeint qu'une fois toutes les **5 secondes** — la règle est
appliquée en base, pas dans le navigateur.

## Prérequis

- **Node 22** (voir `.nvmrc` — `nvm use`)
- **npm 11.12.1** (épinglé via `packageManager`)
- Un projet **Supabase** (voir [Backend](#backend-supabase))

Le paquet `@valentindft/ng-base-config` est privé et hébergé sur le GitHub Package Registry :
il faut un `.npmrc` authentifié pour installer les dépendances.

## Démarrage

```bash
npm ci
npm start
```

L'application est servie sur http://localhost:4200 et se recharge à chaque modification.

## Commandes

| Commande                    | Effet                                                       |
| --------------------------- | ----------------------------------------------------------- |
| `npm start`                 | Serveur de dev (`ng serve`)                                 |
| `npm run build`             | Build de production dans `dist/`                            |
| `npm run watch`             | Build en configuration `development`, en watch              |
| `npm test`                  | Tests unitaires en watch                                    |
| `npm test -- --watch=false` | Un seul passage headless (utilisé par le pre-push et la CI) |
| `npm run lint`              | ESLint sur tout le repo                                     |
| `npm run format`            | Prettier en écriture                                        |

Pour cibler un seul fichier de test, les arguments Vitest passent directement :

```bash
npm test -- src/app/features/home/components/board/board.spec.ts
```

## Architecture

```
src/app/
├── core/                       # singletons non-UI, sans dépendance à un composant
│   ├── mocks/                  # doublures de test (supabase.mock.ts)
│   ├── models/                 # types de domaine (pixel.interface.ts)
│   └── services/               # supabase.service.ts, pixel-board.service.ts
├── features/home/
│   ├── home.ts|html|scss       # assemble les composants, déclenche connect()
│   └── components/
│       ├── header/
│       ├── board/              # la grille 16×16
│       │   └── interfaces/
│       └── color-selector/     # la palette 16 couleurs
│           ├── constants/
│           └── interfaces/
└── shared/                     # composants / directives / pipes réutilisables (vide)
```

Alias TypeScript (déclarés dans `tsconfig.json`, hérités par `tsconfig.app.json` et
`tsconfig.spec.json`) : `@core/*`, `@features/*`, `@shared/*`, `@env`.

`App` monte directement `Home` ; `app.routes.ts` est vide, aucun routage n'est câblé.

### Flux de données

Toute l'état de la grille vit dans `PixelBoardService`, en signals. Les composants sont des
vues sans état :

1. `Home.ngOnInit()` appelle `connect()`, qui charge la grille persistée (`select` sur
   `pixels`) puis s'abonne au canal temps réel. L'appel est idempotent.
2. Un clic sur une case appelle `paint(x, y)`, qui envoie la RPC `paint_pixel`.
3. **La grille n'est pas modifiée localement.** La couleur n'est appliquée qu'au retour de
   l'événement temps réel — le même chemin pour l'auteur du clic et pour les autres joueurs,
   donc pas de divergence possible entre les clients.
4. Un refus (cooldown, réseau) est traduit en message lisible dans `lastError`, affiché par
   `Home` dans un `<p role="status">`.

Conséquence à connaître : un pixel refusé ne s'affiche jamais, même brièvement. C'est
volontaire, mais cela veut dire que la latence réseau est visible à l'œil.

## Backend Supabase

> ⚠️ **Le schéma n'est pas versionné dans ce dépôt.** Les migrations existent uniquement côté
> projet Supabase : inspectez-le depuis le dashboard plutôt que de supposer. Le rapatrier sous
> `supabase/migrations/` serait un vrai gain.

**Table `public.pixels`** — une ligne par case, clé primaire `(x, y)`. Les coordonnées sont
bornées à `0..15`, la couleur est contrainte aux 16 valeurs de la palette, et `updated_at` est
entretenu par un trigger à chaque mise à jour. C'est cet horodatage qui porte le cooldown.

La contrainte sur `color` duplique volontairement la palette du client
(`color-selector.constant.ts`) : **les deux listes doivent rester synchronisées**, sinon une
couleur valide côté UI sera rejetée en base.

**RLS** est activé, avec une seule policy : lecture publique. Il n'existe **aucune policy
d'écriture**, donc insérer ou modifier un pixel directement depuis le navigateur est
impossible. Tout passe par la RPC.

**RPC `paint_pixel(p_x, p_y, p_color)`** — `SECURITY DEFINER`, `search_path` épinglé, c'est
l'unique chemin d'écriture. Elle verrouille la ligne visée, refuse l'écriture si la case a été
peinte il y a moins de 5 secondes, et sinon fait un upsert.

Le cooldown est **par pixel, pas par joueur** : il empêche de repeindre la même case dans les
5 secondes, mais un joueur peut enchaîner les clics sur des cases différentes. Le verrou de
ligne sérialise les écritures concurrentes sur une même case.

En cas de refus, l'erreur remonte avec `message = 'cooldown'` et `details` = le nombre de
secondes restantes. `PixelBoardService.toMessage()` s'appuie sur ce contrat : changer la forme
de l'erreur SQL casse le message affiché sans que rien ne casse à la compilation.

**Realtime** — la table appartient à la publication `supabase_realtime` ; c'est ce qui alimente
l'abonnement du client.

### Configuration

`src/environments/environment.ts` (prod) et `environment.development.ts` (dev, substitué via
`fileReplacements`) contiennent l'URL et la clé Supabase.

La clé versionnée est une clé **publishable** : elle est faite pour être exposée au
navigateur, et la sécurité repose sur RLS (lecture seule) plus la RPC `SECURITY DEFINER`.
N'y mettez jamais une clé `service_role` ni un PAT `sbp_`.

## Tests

Le runner est **Vitest** (via `@angular/build:unit-test`), environnement `jsdom`, globals
fournis par `vitest/globals`.

Les specs ne doivent **jamais** joindre le vrai projet Supabase. `@core/mocks/supabase.mock.ts`
fournit `createSupabaseMock()`, une doublure qui implémente uniquement la surface consommée
par `PixelBoardService`, et permet de piloter les scénarios :

```ts
const mock = createSupabaseMock();
TestBed.configureTestingModule({
  providers: [{ provide: SupabaseService, useValue: mock.service }],
});

mock.state.rows = [{ x: 0, y: 0, color: '#E50000' }]; // état initial
mock.state.rpcError = cooldownError(3); // faire échouer l'écriture
mock.state.emit({ x: 1, y: 1, color: '#0000EA' }); // simuler un événement temps réel
mock.state.rpcCalls; // inspecter les appels à paint_pixel
```

## Qualité

- **pre-commit** (Husky + lint-staged) : `eslint --fix` + Prettier sur TS/HTML,
  `stylelint --fix` + Prettier sur SCSS/CSS, Prettier sur JSON/MD.
- **pre-push** : `npm test -- --watch=false`.
- **CI** (`.github/workflows/ci.yml`) : lint + tests headless sur push et PR vers `main`.

Les configurations ESLint / Prettier / Stylelint / tsconfig / lint-staged proviennent du
paquet partagé `@valentindft/ng-base-config`. Ne les forkez pas localement — étendez ou
proposez une PR sur le paquet.
