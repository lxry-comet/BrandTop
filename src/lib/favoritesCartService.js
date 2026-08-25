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

/** Zwraca zawartość koszyka usera razem z danymi produktu. */
export async function getCart(userId) {
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
 */
export async function addToCart(userId, productId, size = null, quantity = 1) {
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
    if (quantity < 1) return removeCartItem(cartItemId);

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

    if (error) throw error;
}

/** Zmiana rozmiaru wybranej pozycji koszyka (odpowiednik updateCartItemSize()). */
export async function updateCartItemSize(cartItemId, size) {
    const { error } = await supabase
        .from('cart_items')
        .update({ size })
        .eq('id', cartItemId);

    if (error) throw error;
}

/** Usuwa jedną pozycję z koszyka. */
export async function removeCartItem(cartItemId) {
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
