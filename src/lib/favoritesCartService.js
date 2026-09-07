// src/lib/favoritesCartService.js
//
// Warstwa dostępu do danych dla „Dodano do ulubionych” i „Dodać do koszyka”.
// Wszystkie funkcje zakładają, że tabele favorites / cart_items / products
// z supabase_schema.sql są już utworzone, a RLS pilnuje, żeby każdy user
// widział wyłącznie swoje wiersze.
//
// Użycie w komponencie (przykład):
//
//   import { toggleFavorite, getCart, addToCart } from '../lib/favoritesCartService';
//
//   await toggleFavorite(user.id, product.id);
//   const cart = await getCart(user.id);

import { supabase } from './supabaseClient';

// ---------------------------------------------------------------------
// KOSZYK GOŚCIA (niezalogowany klient) — localStorage
// ---------------------------------------------------------------------
//
// Klient bez konta może dodawać produkty do koszyka — trzymamy je w
// localStorage (RLS w cart_items i tak nie pozwoliłoby zapisać nic bez
// zalogowania). Dopiero przy próbie przejścia do płatności (Cart.jsx →
// "Przejdź do kasy") wymagamy logowania/rejestracji, a zaraz po udanym
// zalogowaniu ten lokalny koszyk zostaje scalony z prawdziwym kontem
// (mergeGuestCartIntoAccount) i wyczyszczony z przeglądarki.
//
// Każda pozycja koszyka gościa ma id w formacie `guest_<productId>_<size>` —
// dzięki temu updateCartItemQuantity/removeCartItem/updateCartItemSize
// rozpoznają po samym id, czy operować na localStorage, czy na Supabase,
// i Cart.jsx/ProductPage.jsx nie muszą wcale wiedzieć, z którym trybem mają
// do czynienia.

const GUEST_CART_KEY = 'brandtop_guest_cart';
const GUEST_ID_PREFIX = 'guest_';

function isGuestCartItemId(id) {
    return typeof id === 'string' && id.startsWith(GUEST_ID_PREFIX);
}

function buildGuestItemId(productId, size) {
    return `${GUEST_ID_PREFIX}${productId}_${size ?? 'nosize'}`;
}

function readGuestCartRaw() {
    try {
        const raw = window.localStorage.getItem(GUEST_CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Uszkodzony/nieprawidłowy JSON w localStorage — traktujemy jak pusty koszyk,
        // zamiast wywalać całą stronę błędem parsowania.
        return [];
    }
}

function writeGuestCartRaw(items) {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    // To samo zdarzenie, na które Header.jsx już nasłuchuje przy koszyku
    // zalogowanego użytkownika — dzięki temu licznik przy ikonie koszyka
    // odświeża się identycznie niezależnie od tego, czy ktoś jest zalogowany.
    window.dispatchEvent(new Event('brandtop:cart-updated'));
}

function sameGuestLine(item, productId, size) {
    return item.productId === productId && (item.size ?? null) === (size ?? null);
}

/** Dodaje produkt do koszyka gościa (localStorage). Ten sam produkt+rozmiar zwiększa quantity. */
function addToGuestCart(productId, size = null, quantity = 1) {
    const items = readGuestCartRaw();
    const existing = items.find((i) => sameGuestLine(i, productId, size));

    if (existing) {
        existing.quantity += quantity;
    } else {
        items.push({ productId, size, quantity });
    }

    writeGuestCartRaw(items);
}

function updateGuestCartItemQuantity(guestItemId, quantity) {
    if (quantity < 1) return removeGuestCartItem(guestItemId);

    const items = readGuestCartRaw().map((item) => {
        const id = buildGuestItemId(item.productId, item.size);
        return id === guestItemId ? { ...item, quantity } : item;
    });
    writeGuestCartRaw(items);
}

function updateGuestCartItemSize(guestItemId, size) {
    const items = readGuestCartRaw().map((item) => {
        const id = buildGuestItemId(item.productId, item.size);
        return id === guestItemId ? { ...item, size } : item;
    });
    writeGuestCartRaw(items);
}

function removeGuestCartItem(guestItemId) {
    const items = readGuestCartRaw().filter(
        (item) => buildGuestItemId(item.productId, item.size) !== guestItemId
    );
    writeGuestCartRaw(items);
}

function clearGuestCart() {
    window.localStorage.removeItem(GUEST_CART_KEY);
    window.dispatchEvent(new Event('brandtop:cart-updated'));
}

/** Sama liczba sztuk w koszyku gościa — do odznaki przy ikonie koszyka w Header.jsx. */
export function getGuestCartCount() {
    return readGuestCartRaw().reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/** Dociąga dane produktów (nazwa, cena, zdjęcie) do surowych wpisów koszyka gościa. */
async function getGuestCartWithProducts() {
    const rawItems = readGuestCartRaw();
    if (!rawItems.length) return [];

    const ids = [...new Set(rawItems.map((i) => i.productId))];
    const { data: products, error } = await supabase.from('products').select('*').in('id', ids);
    if (error) throw error;

    // .filter(Boolean) — jeśli produkt w międzyczasie został usunięty z bazy,
    // po prostu znika z widoku koszyka zamiast wywalać błędem.
    return rawItems
        .map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            return {
                id: buildGuestItemId(item.productId, item.size),
                size: item.size,
                quantity: item.quantity,
                product
            };
        })
        .filter(Boolean);
}

/**
 * Wywołaj zaraz po udanym zalogowaniu/rejestracji (Cart.jsx → handleAuthSuccess) —
 * przenosi wszystko z koszyka gościa (localStorage) na konto w Supabase,
 * korzystając z tego samego addToCart() co reszta kodu (więc te same reguły
 * łączenia duplikatów produkt+rozmiar), i czyści localStorage.
 */
export async function mergeGuestCartIntoAccount(userId) {
    const rawItems = readGuestCartRaw();
    if (!rawItems.length) return;

    for (const item of rawItems) {
        await addToCart(userId, item.productId, item.size, item.quantity);
    }

    clearGuestCart();
}

// ---------------------------------------------------------------------
// FAVORITES ("Dodano do ulubionych")
// ---------------------------------------------------------------------

/** Zwraca listę ulubionych produktów usera (razem z danymi produktu). */
export async function getFavorites(userId) {
    const { data, error } = await supabase
        .from('favorites')
        .select('id, created_at, product:products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/** Zwraca same product_id ulubionych — wygodne do znakowania serduszek w gridzie. */
export async function getFavoriteProductIds(userId) {
    const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', userId);

    if (error) throw error;
    return data.map((row) => row.product_id);
}

/** Dodaje produkt do ulubionych. Bezpieczne przy podwójnym kliknięciu (brak duplikatu). */
export async function addFavorite(userId, productId) {
    const { error } = await supabase
        .from('favorites')
        .upsert(
            { user_id: userId, product_id: productId },
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
        );

    if (error) throw error;
}

/** Usuwa produkt z ulubionych. */
export async function removeFavorite(userId, productId) {
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

    if (error) throw error;
}

/**
 * Odpowiednik toggleFavorite() z oryginalnego brandtop_modified_9.html —
 * ale zamiast trzymać stan w zmiennej `favorites` w JS, zapisuje go w bazie.
 * Zwraca true, jeśli produkt jest teraz ulubiony, false jeśli został usunięty.
 */
export async function toggleFavorite(userId, productId) {
    const { data: existing, error: selectError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
        await removeFavorite(userId, productId);
        return false;
    }

    await addFavorite(userId, productId);
    return true;
}

// ---------------------------------------------------------------------
// CART ("Dodać do koszyka")
// ---------------------------------------------------------------------

/**
 * Zwraca zawartość koszyka razem z danymi produktu.
 * Bez userId (gość, niezalogowany) — czyta koszyk z localStorage zamiast Supabase.
 */
export async function getCart(userId) {
    if (!userId) return getGuestCartWithProducts();

    const { data, error } = await supabase
        .from('cart_items')
        .select('id, size, quantity, created_at, product:products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Dodaje produkt do koszyka. Jeśli ten sam produkt+rozmiar już tam jest,
 * zwiększa quantity zamiast tworzyć duplikat (dzięki UNIQUE(user_id, product_id, size)
 * i on conflict poniżej).
 * Bez userId (gość, niezalogowany) — zapisuje do koszyka w localStorage.
 */
export async function addToCart(userId, productId, size = null, quantity = 1) {
    if (!userId) return addToGuestCart(productId, size, quantity);

    const { data: existing, error: selectError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('size', size)
        .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
        const { error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: userId, product_id: productId, size, quantity });

    if (error) throw error;
}

/** Ustawia dokładną ilość danej pozycji koszyka (np. przy zmianie w input +/-). */
export async function updateCartItemQuantity(cartItemId, quantity) {
    if (isGuestCartItemId(cartItemId)) return updateGuestCartItemQuantity(cartItemId, quantity);
    if (quantity < 1) return removeCartItem(cartItemId);

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

    if (error) throw error;
}

/** Zmiana rozmiaru wybranej pozycji koszyka (odpowiednik updateCartItemSize()). */
export async function updateCartItemSize(cartItemId, size) {
    if (isGuestCartItemId(cartItemId)) return updateGuestCartItemSize(cartItemId, size);

    const { error } = await supabase
        .from('cart_items')
        .update({ size })
        .eq('id', cartItemId);

    if (error) throw error;
}

/** Usuwa jedną pozycję z koszyka. */
export async function removeCartItem(cartItemId) {
    if (isGuestCartItemId(cartItemId)) return removeGuestCartItem(cartItemId);

    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);
    if (error) throw error;
}

/** Czyści cały koszyk usera — wywołaj po udanym złożeniu zamówienia. */
export async function clearCart(userId) {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
    if (error) throw error;
}

// ---------------------------------------------------------------------
// ORDERS ("Kup teraz" w koszyku)
// ---------------------------------------------------------------------

/**
 * Składa zamówienie na podstawie aktualnej zawartości koszyka (wynik getCart()).
 * Tworzy wiersz w `orders`, po jednym wierszu w `order_items` na każdą pozycję
 * (unit_price = product.price_pln, bo tak nazywa się cena w realnej tabeli
 * products — patrz supabase_schema.sql), a na końcu czyści koszyk.
 * addressId jest opcjonalny (kolumna orders.address_id dopuszcza NULL).
 * Zwraca utworzony wiersz `orders`.
 */
export async function completeOrder(userId, cartItems, addressId = null) {
    if (!cartItems || !cartItems.length) {
        throw new Error('Koszyk jest pusty.');
    }

    const total = cartItems.reduce(
        (sum, item) => sum + Number(item.product?.price_pln || 0) * item.quantity,
        0
    );

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: userId, status: 'pending', total, address_id: addressId })
        .select()
        .single();

    if (orderError) throw orderError;

    const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id ?? item.product?.id,
        size: item.size,
        quantity: item.quantity,
        unit_price: item.product?.price_pln ?? 0
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    await clearCart(userId);

    return order;
}