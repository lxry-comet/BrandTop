// supabase/functions/create-checkout-session/index.ts
//
// Wywoływana z frontendu (Cart/Checkout) po kliknięciu "Zapłać".
// Sprawdza adres, liczy ceny po stronie serwera, tworzy sesję Stripe.
//
// Sekrety do ustawienia (supabase secrets set):
//   STRIPE_SECRET_KEY
//   SITE_URL   (np. https://twoja-domena.pl — do success/cancel url)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    // Klient Supabase działający w kontekście użytkownika (RLS respektowane)
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Musisz być zalogowany." }, 401);
    }

    const body = await req.json();
    const { shippingMethodId, items, cartItemIds } = body as {
      shippingMethodId: string;
      items: { productId: string; size: number; quantity: number }[];
      cartItemIds?: number[];
    };

    if (!items?.length) {
      return json({ error: "Koszyk jest pusty." }, 400);
    }

    // 1) Adres — musi być kompletny (miasto, ulica, numer domu)
    const { data: address, error: addrError } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (addrError) return json({ error: addrError.message }, 500);
    if (!address || !address.city || !address.street || !address.house_number) {
      return json(
        { error: "Uzupełnij pełny adres dostawy (miasto, ulica, numer domu) w Moje konto." },
        400
      );
    }

    // 2) Metoda dostawy — cena z bazy, nie z frontendu
    const { data: shippingMethod, error: shipError } = await supabase
      .from("shipping_methods")
      .select("*")
      .eq("id", shippingMethodId)
      .eq("is_active", true)
      .maybeSingle();

    if (shipError || !shippingMethod) {
      return json({ error: "Nieprawidłowa metoda dostawy." }, 400);
    }

    // 3) Pozycje zamówienia — ceny i stan z bazy, nie z frontendu
    const lineItems = [];
    const orderItemsDraft = [];

    for (const item of items) {
      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, name, price_pln, image_url")
        .eq("id", item.productId)
        .eq("is_active", true)
        .maybeSingle();

      if (prodError || !product) {
        return json({ error: `Produkt ${item.productId} niedostępny.` }, 400);
      }

      const { data: sizeRow, error: sizeError } = await supabase
        .from("product_sizes")
        .select("size, stock")
        .eq("product_id", item.productId)
        .eq("size", item.size)
        .maybeSingle();

      if (sizeError || !sizeRow || sizeRow.stock < item.quantity) {
        return json(
          { error: `Brak wystarczającego stanu: ${product.name} (rozmiar ${item.size}).` },
          400
        );
      }

      lineItems.push({
        price_data: {
          currency: "pln",
          product_data: {
            name: `${product.name} (rozm. ${item.size})`,
            images: product.image_url ? [product.image_url] : undefined,
          },
          unit_amount: Math.round(product.price_pln * 100),
        },
        quantity: item.quantity,
      });

      orderItemsDraft.push({
        product_id: product.id,
        size: item.size,
        quantity: item.quantity,
        price: product.price_pln,
      });
    }

    const siteUrl = Deno.env.get("SITE_URL")!;

    // 4) Sesja Stripe — karta + BLIK, stała opcja dostawy
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "blik"],
      customer_email: user.email,
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(shippingMethod.price * 100),
              currency: "pln",
            },
            display_name: shippingMethod.name,
          },
        },
      ],
      success_url: `${siteUrl}/checkout/sukces?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/koszyk`,
      metadata: {
        user_id: user.id,
        shipping_method_id: shippingMethod.id,
        address_id: address.id,
        order_items: JSON.stringify(orderItemsDraft),
        cart_item_ids: JSON.stringify(cartItemIds || []),
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error(err);
    return json({ error: "Błąd serwera przy tworzeniu płatności." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}