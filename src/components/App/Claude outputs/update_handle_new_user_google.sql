-- update_handle_new_user_google.sql
--
-- Aktualizuje funkcję handle_new_user() tak, żeby wiersz w profiles wypełniał
-- się poprawnie także przy logowaniu przez Google, nie tylko przy rejestracji
-- e-mail/hasłem. Google nie podaje first_name/last_name — podaje full_name/name
-- oraz avatar_url/picture — więc funkcja teraz obsługuje oba przypadki.
--
-- Bezpieczne do uruchomienia w Supabase SQL Editor w dowolnym momencie —
-- `create or replace function` nadpisuje istniejącą funkcję, trigger zostaje
-- ten sam (nie trzeba go tworzyć ponownie).
--
-- Dotyczy tylko NOWYCH rejestracji/logowań od teraz. Jeśli chcesz też uzupełnić
-- profil dla konta, które już zalogowało się przez Google wcześniej (np. Twoje
-- testowe sitedotcom.support@gmail.com), zrób to ręcznie — przykład na dole pliku.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    meta      jsonb := new.raw_user_meta_data;
    full_name text  := coalesce(meta ->> 'full_name', meta ->> 'name');
    space_pos int   := position(' ' in coalesce(full_name, ''));
begin
    insert into public.profiles (id, first_name, last_name, avatar_url)
    values (
        new.id,
        coalesce(
            nullif(meta ->> 'first_name', ''),
            case when space_pos > 0 then substring(full_name from 1 for space_pos - 1) else full_name end
        ),
        coalesce(
            nullif(meta ->> 'last_name', ''),
            case when space_pos > 0 then substring(full_name from space_pos + 1) else null end
        ),
        coalesce(meta ->> 'avatar_url', meta ->> 'picture')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Opcjonalnie: uzupełnij profil dla konta, które zalogowało się przez Google
-- PRZED tą zmianą (trigger uruchamia się tylko przy nowym INSERT do auth.users,
-- więc istniejący, pusty wiersz w profiles trzeba poprawić ręcznie jednym updatem).
-- Podmień adres e-mail na swój i odkomentuj:
-- ---------------------------------------------------------------------

-- update public.profiles p
-- set
--     first_name = coalesce(nullif(p.first_name, ''), split_part(u.raw_user_meta_data ->> 'full_name', ' ', 1)),
--     last_name  = coalesce(nullif(p.last_name, ''), nullif(substring(u.raw_user_meta_data ->> 'full_name' from position(' ' in u.raw_user_meta_data ->> 'full_name') + 1), '')),
--     avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
-- from auth.users u
-- where p.id = u.id
--   and u.email = 'sitedotcom.support@gmail.com';
