-- add_product_filter_columns.sql
--
-- Dodaje kolumny potrzebne do pełnego zestawu filtrów z makiety
-- (brandtop_modified_9.html): Płeć, Sezon, Typ, Rodzaj, Kolor, Zniżki.
-- Wszystko dodawane jest jako NULLABLE / z bezpiecznym defaultem — istniejące
-- produkty po prostu będą miały te pola puste, dopóki nie uzupełnisz ich
-- w panelu Admin (formularz produktu dostał te same pola).
--
-- Bezpieczne do wielokrotnego uruchomienia — `add column if not exists`.
-- Nie rusza kolumn, które już masz (type, brand, price_pln, itd.).

alter table public.products add column if not exists gender        text[] not null default '{}';
alter table public.products add column if not exists season        text;
alter table public.products add column if not exists product_type  text[] not null default '{}';
alter table public.products add column if not exists kind          text[] not null default '{}';
alter table public.products add column if not exists color         text[] not null default '{}';
alter table public.products add column if not exists old_price_pln numeric;

comment on column public.products.gender is 'Filtr "Płeć" — np. {"Mężczyzna"}, {"Kobieta"}, albo {"Mężczyzna","Kobieta"} dla unisex.';
comment on column public.products.season is 'Filtr "Sezon" — pojedyncza wartość, np. Lato / Zima / Wiosna-Jesień / Cały rok.';
comment on column public.products.product_type is 'Filtr "Typ" z makiety — głównie dla Obuwie: Bieganie, Koszykówka, Skate, Trening, Outdoor, Trail, Codzienna.';
comment on column public.products.kind is 'Filtr "Rodzaj" z makiety — głównie dla Odzież/Akcesoria: Bluza, Koszulka, Spodnie, Czapka, Plecak itd.';
comment on column public.products.color is 'Filtr "Kolor" — tablica, produkt może mieć kilka kolorystyk.';
comment on column public.products.old_price_pln is 'Cena przed promocją. NULL = produkt bez zniżki. Filtr "Tylko zniżki" sprawdza IS NOT NULL.';

-- Indeks GIN przyspiesza filtrowanie po tablicach (gender/product_type/kind/color)
-- przy większej liczbie produktów — nieobowiązkowy dziś, ale tani i bezpieczny.
create index if not exists idx_products_gender       on public.products using gin (gender);
create index if not exists idx_products_product_type on public.products using gin (product_type);
create index if not exists idx_products_kind         on public.products using gin (kind);
create index if not exists idx_products_color        on public.products using gin (color);
