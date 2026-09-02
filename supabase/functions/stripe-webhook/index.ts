// supabase/functions/stripe-webhook/index.ts
//
// Endpoint podpięty w Stripe Dashboard → Webhooks (event: checkout.session.completed).
// URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//
// Po opłaceniu zamówienia wysyła DWA maile:
//   1) do SHIPPING_MANAGER_EMAIL — z danymi do wysyłki paczki
//   2) do klienta (adres z sesji Stripe) — potwierdzenie zamówienia
//
// Sekrety do ustawienia (supabase secrets set):
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//   SENDGRID_API_KEY
//   SENDGRID_FROM_EMAIL       (adres zweryfikowany w SendGrid, np. zamowienia@brand-top.pl)
//   SHIPPING_MANAGER_EMAIL    (adres osoby, która ma wysyłać paczki)
//   SUPABASE_SERVICE_ROLE_KEY (do zapisu z pominięciem RLS)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("Stripe-Signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Nieprawidłowy podpis webhooka:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Klient z service_role — pomija RLS, bo to zaufany backend Stripe → nasz serwer
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Idempotencja — jeśli już zapisane, nie duplikuj
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return new Response("ok (already processed)", { status: 200 });
    }

    const metadata = session.metadata!;
    const orderItems = JSON.parse(metadata.order_items || "[]") as {
      product_id: string;
      size: number;
      quantity: number;
      price: number;
    }[];

    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", metadata.address_id)
      .maybeSingle();

    const { data: shippingMethod } = await supabase
      .from("shipping_methods")
      .select("*")
      .eq("id", metadata.shipping_method_id)
      .maybeSingle();

    const paymentMethod = session.payment_method_types?.[0] ?? "card";
    const totalAmount = (session.amount_total ?? 0) / 100;

    // 1) Zapis zamówienia
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: metadata.user_id,
        status: "paid",
        total: totalAmount,
        stripe_session_id: session.id,
        payment_method: paymentMethod,
        payment_status: "paid",
        shipping_method: shippingMethod?.id ?? metadata.shipping_method_id,
        shipping_price: shippingMethod?.price ?? 0,
        shipping_address: address,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Błąd zapisu zamówienia:", orderError);
      return new Response("DB error", { status: 500 });
    }

    // 2) Zapis pozycji zamówienia + zmniejszenie stanu magazynowego
    for (const item of orderItems) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: item.product_id,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      });

      await supabase.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_size: item.size,
        p_quantity: item.quantity,
      });
    }

    // 2b) Usunięcie z koszyka TYLKO tych pozycji, które faktycznie zamówiono —
    // klient mógł zaznaczyć na /checkout tylko część produktów z koszyka
    // (patrz Checkout.jsx: selectedCartItemIds), reszta ma zostać w koszyku.
    // Robimy to dopiero TERAZ (po potwierdzonej płatności), a nie w momencie
    // kliknięcia "Zapłać" — inaczej porzucona/nieudana płatność czyściłaby
    // koszyk bez faktycznego zamówienia.
    const cartItemIds = JSON.parse(metadata.cart_item_ids || "[]") as number[];
    if (cartItemIds.length) {
      const { error: cartDeleteError } = await supabase
        .from("cart_items")
        .delete()
        .in("id", cartItemIds)
        .eq("user_id", metadata.user_id); // dodatkowe zabezpieczenie — tylko własne pozycje

      if (cartDeleteError) {
        console.error("Nie udało się wyczyścić koszyka:", cartDeleteError);
        // Nieudane czyszczenie koszyka nie powinno cofać już zapisanego
        // zamówienia ani blokować maili — klient po prostu zobaczy kupiony
        // produkt nadal w koszyku i będzie mógł go ręcznie usunąć.
      }
    }

    // 3) Mail do osoby zarządzającej wysyłką (SendGrid)
    await sendShippingEmail(order, address, shippingMethod, orderItems);

    // 4) Mail potwierdzający do klienta
    // Stripe zbiera adres e-mail podczas checkoutu — nie trzeba nic dodatkowo pytać.
    const customerEmail = session.customer_details?.email ?? session.customer_email;
    if (customerEmail) {
      await sendCustomerConfirmationEmail(order, address, shippingMethod, orderItems, customerEmail);
    } else {
      console.error("Brak adresu e-mail klienta w sesji Stripe — nie wysłano potwierdzenia.");
    }
  }

  return new Response("ok", { status: 200 });
});

async function sendShippingEmail(
  order: any,
  address: any,
  shippingMethod: any,
  items: { product_id: string; size: number; quantity: number; price: number }[]
) {
  // Ten sam styl co strona: tło #2b2b2b, akcent #ff5e00, karty rgba(0,0,0,0.32),
  // wpisany inline (bez zmiennych CSS) — tak żeby poprawnie wyświetlał się w każdej skrzynce.
  const itemsRows = items
    .map(
      (i) => `
        <tr style="background-color:rgba(0,0,0,0.32); border-top:1px solid #4a4a4a;">
          <td style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.product_id}</td>
          <td class="col-hide-mobile" style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.size}</td>
          <td style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.quantity}</td>
          <td style="padding:12px 14px; font-size:14px; color:#ffffff; text-align:right;">${i.price} zł</td>
        </tr>`
    )
    .join("");

  const apartmentSuffix = address?.apartment ? `/${address.apartment}` : "";
  const siteUrl = Deno.env.get("SITE_URL") ?? "";

  const html = `
  <!DOCTYPE html>
  <html lang="pl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .email-wrapper { width: 100% !important; border-radius: 0 !important; }
        .pad-outer { padding-left: 16px !important; padding-right: 16px !important; }
        .pad-header { padding: 18px 16px !important; }
        .pad-title { padding: 24px 16px 8px 16px !important; }
        .pad-card { padding: 12px 14px !important; }
        .title-text { font-size: 19px !important; }
        .logo-text { font-size: 19px !important; }
        .items-table th, .items-table td { padding: 8px 6px !important; font-size: 12px !important; }
        .col-hide-mobile { display: none !important; }
        .cta-cell { padding: 20px 16px 8px 16px !important; }
        .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        .total-value { font-size: 17px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#1a1a1a; font-family:'Inter', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-wrapper" style="max-width:600px; width:100%; background-color:#2b2b2b; border-radius:18px; overflow:hidden; border:1px solid #4a4a4a;">

          <tr>
            <td class="pad-header" style="background-color:#000000; padding:24px 32px; text-align:center;">
              <span class="logo-text" style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#ffffff; text-transform:uppercase;">
                BRAND<span style="color:#ff5e00;">-TOP</span>
              </span>
            </td>
          </tr>

          <tr>
            <td class="pad-title" style="padding:32px 32px 8px 32px;">
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ff5e00; background-color:rgba(255,94,0,0.12); padding:4px 10px; border-radius:20px;">
                Nowe zamówienie
              </span>
              <h1 class="title-text" style="margin:14px 0 0 0; font-size:22px; font-weight:900; color:#ffffff; text-transform:uppercase; letter-spacing:-0.3px;">
                Zamówienie #${order.id}
              </h1>
              <div style="height:4px; width:56px; background-color:#ff5e00; border-radius:2px; margin-top:8px;"></div>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(0,0,0,0.32); border-radius:14px; border:1px solid #555555;">
                <tr><td class="pad-card" style="padding:16px 20px;">
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Metoda dostawy</p>
                  <p style="margin:0 0 14px 0; font-size:15px; color:#ffffff; font-weight:600;">${shippingMethod?.name ?? "-"} — ${shippingMethod?.price ?? 0} zł</p>
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Metoda płatności</p>
                  <p style="margin:0; font-size:15px; color:#ffffff; font-weight:600;">${order.payment_method}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(0,0,0,0.32); border-radius:14px; border-left:3px solid #ff5e00;">
                <tr><td class="pad-card" style="padding:16px 20px;">
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Adres dostawy</p>
                  <p style="margin:0; font-size:15px; color:#ffffff; line-height:22px;">
                    ${address?.city ?? ""}, ul. ${address?.street ?? ""} ${address?.house_number ?? ""}${apartmentSuffix}<br>
                    kod pocztowy: ${address?.zip_code ?? "-"}<br>
                    <span style="color:#cccccc; font-size:13px;">uwagi: ${address?.notes ?? "-"}</span>
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 10px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Produkty</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="items-table" style="border-collapse:collapse; border-radius:14px; overflow:hidden;">
                <tr style="background-color:#000000;">
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">SKU</td>
                  <td class="col-hide-mobile" style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">Rozmiar</td>
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">Ilość</td>
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700; text-align:right;">Cena</td>
                </tr>
                ${itemsRows}
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:20px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:18px 20px; background-color:#ff5e00; border-radius:14px;" align="right">
                  <span style="font-size:12px; color:#000000; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Razem do wysyłki&nbsp;&nbsp;</span>
                  <span class="total-value" style="font-size:20px; color:#000000; font-weight:900;">${order.total} zł</span>
                </td></tr>
              </table>
            </td>
          </tr>

          ${
            siteUrl
              ? `<tr><td class="cta-cell" style="padding:28px 32px 8px 32px;" align="center">
                  <a href="${siteUrl}/admin/orders/${order.id}" target="_blank"
                     class="cta-button"
                     style="display:inline-block; background-color:#ff5e00; color:#000000; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; text-decoration:none; padding:14px 32px; border-radius:30px;">
                    Zobacz zamówienie
                  </a>
                </td></tr>`
              : ""
          }

          <tr>
            <td class="pad-outer" style="padding:28px 32px 24px 32px; border-top:1px solid #4a4a4a;">
              <p style="margin:0; font-size:12px; line-height:20px; color:#999999; text-align:center;">
                Wiadomość systemowa Brand-Top — powiadomienie o nowym opłaconym zamówieniu.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body></html>`;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        { to: [{ email: Deno.env.get("SHIPPING_MANAGER_EMAIL") }] },
      ],
      from: { email: Deno.env.get("SENDGRID_FROM_EMAIL") },
      subject: `Nowe zamówienie #${order.id} do wysyłki`,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    console.error("SendGrid error:", await res.text());
  }
}

async function sendCustomerConfirmationEmail(
  order: any,
  address: any,
  shippingMethod: any,
  items: { product_id: string; size: number; quantity: number; price: number }[],
  customerEmail: string
) {
  const itemsRows = items
    .map(
      (i) => `
        <tr style="background-color:rgba(0,0,0,0.32); border-top:1px solid #4a4a4a;">
          <td style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.product_id}</td>
          <td class="col-hide-mobile" style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.size}</td>
          <td style="padding:12px 14px; font-size:14px; color:#ffffff;">${i.quantity}</td>
          <td style="padding:12px 14px; font-size:14px; color:#ffffff; text-align:right;">${i.price} zł</td>
        </tr>`
    )
    .join("");

  const apartmentSuffix = address?.apartment ? `/${address.apartment}` : "";
  const siteUrl = Deno.env.get("SITE_URL") ?? "";

  const html = `
  <!DOCTYPE html>
  <html lang="pl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .email-wrapper { width: 100% !important; border-radius: 0 !important; }
        .pad-outer { padding-left: 16px !important; padding-right: 16px !important; }
        .pad-header { padding: 18px 16px !important; }
        .pad-title { padding: 24px 16px 8px 16px !important; }
        .pad-card { padding: 12px 14px !important; }
        .title-text { font-size: 19px !important; }
        .logo-text { font-size: 19px !important; }
        .items-table th, .items-table td { padding: 8px 6px !important; font-size: 12px !important; }
        .col-hide-mobile { display: none !important; }
        .cta-cell { padding: 20px 16px 8px 16px !important; }
        .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        .total-value { font-size: 17px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#1a1a1a; font-family:'Inter', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-wrapper" style="max-width:600px; width:100%; background-color:#2b2b2b; border-radius:18px; overflow:hidden; border:1px solid #4a4a4a;">

          <tr>
            <td class="pad-header" style="background-color:#000000; padding:24px 32px; text-align:center;">
              <span class="logo-text" style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#ffffff; text-transform:uppercase;">
                BRAND<span style="color:#ff5e00;">-TOP</span>
              </span>
            </td>
          </tr>

          <tr>
            <td class="pad-title" style="padding:32px 32px 8px 32px;">
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ff5e00; background-color:rgba(255,94,0,0.12); padding:4px 10px; border-radius:20px;">
                Zamówienie przyjęte
              </span>
              <h1 class="title-text" style="margin:14px 0 0 0; font-size:22px; font-weight:900; color:#ffffff; text-transform:uppercase; letter-spacing:-0.3px;">
                Dziękujemy za zakupy!
              </h1>
              <div style="height:4px; width:56px; background-color:#ff5e00; border-radius:2px; margin-top:8px;"></div>
              <p style="margin:16px 0 0 0; font-size:14px; color:#cccccc; line-height:20px;">
                Twoje zamówienie <strong style="color:#ffffff;">#${order.id}</strong> zostało opłacone i przekazane do realizacji.
                Gdy tylko paczka trafi do przewoźnika, dasz znać — a na razie podsumowanie poniżej.
              </p>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(0,0,0,0.32); border-radius:14px; border:1px solid #555555;">
                <tr><td class="pad-card" style="padding:16px 20px;">
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Metoda dostawy</p>
                  <p style="margin:0 0 14px 0; font-size:15px; color:#ffffff; font-weight:600;">${shippingMethod?.name ?? "-"} — ${shippingMethod?.price ?? 0} zł</p>
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Metoda płatności</p>
                  <p style="margin:0; font-size:15px; color:#ffffff; font-weight:600;">${order.payment_method}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(0,0,0,0.32); border-radius:14px; border-left:3px solid #ff5e00;">
                <tr><td class="pad-card" style="padding:16px 20px;">
                  <p style="margin:0 0 6px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Adres dostawy</p>
                  <p style="margin:0; font-size:15px; color:#ffffff; line-height:22px;">
                    ${address?.city ?? ""}, ul. ${address?.street ?? ""} ${address?.house_number ?? ""}${apartmentSuffix}<br>
                    kod pocztowy: ${address?.zip_code ?? "-"}
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 10px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#999999;">Twoje produkty</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="items-table" style="border-collapse:collapse; border-radius:14px; overflow:hidden;">
                <tr style="background-color:#000000;">
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">SKU</td>
                  <td class="col-hide-mobile" style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">Rozmiar</td>
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700;">Ilość</td>
                  <td style="padding:10px 14px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#ff5e00; font-weight:700; text-align:right;">Cena</td>
                </tr>
                ${itemsRows}
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad-outer" style="padding:20px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:18px 20px; background-color:#ff5e00; border-radius:14px;" align="right">
                  <span style="font-size:12px; color:#000000; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Zapłacono&nbsp;&nbsp;</span>
                  <span class="total-value" style="font-size:20px; color:#000000; font-weight:900;">${order.total} zł</span>
                </td></tr>
              </table>
            </td>
          </tr>

          ${
            siteUrl
              ? `<tr><td class="cta-cell" style="padding:28px 32px 8px 32px;" align="center">
                  <a href="${siteUrl}/moje-konto?tab=zamowienia" target="_blank" class="cta-button"
                     style="display:inline-block; background-color:#ff5e00; color:#000000; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; text-decoration:none; padding:14px 32px; border-radius:30px;">
                    Śledź swoje zamówienie
                  </a>
                </td></tr>`
              : ""
          }

          <tr>
            <td class="pad-outer" style="padding:28px 32px 24px 32px; border-top:1px solid #4a4a4a;">
              <p style="margin:0; font-size:12px; line-height:20px; color:#999999; text-align:center;">
                Masz pytania dotyczące zamówienia? Odpisz na tego maila — chętnie pomożemy.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body></html>`;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: customerEmail }] }],
      from: { email: Deno.env.get("SENDGRID_FROM_EMAIL"), name: "Brand-Top" },
      subject: `Potwierdzenie zamówienia #${order.id} — Brand-Top`,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    console.error("SendGrid error (mail do klienta):", await res.text());
  }
}