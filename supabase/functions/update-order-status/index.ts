// supabase/functions/update-order-status/index.ts
//
// Wywoływana z panelu Admin przy zmianie statusu zamówienia. Weryfikuje, że
// wywołujący jest adminem, aktualizuje status w bazie (service_role, żeby ominąć
// RLS przy zapisie — nie tylko przy odczycie) i wysyła klientowi odpowiedni mail
// o zmianie statusu (przyjęte do realizacji / wysłane z numerem przesyłki).
//
// Sekrety wymagane (te same co stripe-webhook):
//   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SITE_URL
//   SUPABASE_SERVICE_ROLE_KEY (wbudowane automatycznie)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekujące",
  paid: "Opłacone",
  processing: "Przyjęte do realizacji",
  shipped: "Wysłane",
  completed: "Zrealizowane",
  cancelled: "Anulowane",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) Klient w kontekście wywołującego — do weryfikacji, że to admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Musisz być zalogowany." }, 401);
    }

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return json({ error: "Brak uprawnień administratora." }, 403);
    }

    const { orderId, newStatus, trackingNumber } = await req.json();

    if (!orderId || !newStatus) {
      return json({ error: "Brak orderId lub newStatus." }, 400);
    }

    // 2) Klient z service_role — do zapisu w bazie i odczytu e-maila klienta
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber || null;

    const { data: order, error: updateError } = await adminClient
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Błąd zmiany statusu:", updateError);
      return json({ error: "Nie udało się zapisać statusu." }, 500);
    }

    // 3) Mail do klienta — tylko dla statusów, które realnie go interesują
    if (newStatus === "processing" || newStatus === "shipped") {
      const { data: userData } = await adminClient.auth.admin.getUserById(order.user_id);
      const customerEmail = userData?.user?.email;

      if (customerEmail) {
        await sendStatusEmail(customerEmail, order, newStatus, trackingNumber);
      } else {
        console.error("Nie znaleziono e-maila klienta dla user_id:", order.user_id);
      }
    }

    return json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return json({ error: "Błąd serwera." }, 500);
  }
});

async function sendStatusEmail(
  customerEmail: string,
  order: any,
  newStatus: string,
  trackingNumber?: string
) {
  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;

  const heading =
    newStatus === "processing"
      ? "Twoje zamówienie zostało przyjęte do realizacji"
      : "Twoje zamówienie zostało wysłane!";

  const bodyText =
    newStatus === "processing"
      ? "Sprawdziliśmy Twoje zamówienie i już je dla Ciebie przygotowujemy. Damy znać, gdy tylko trafi do przewoźnika."
      : "Paczka jest już w drodze. Poniżej znajdziesz numer przesyłki do śledzenia.";

  const trackingHtml =
    newStatus === "shipped" && trackingNumber
      ? `<p style="margin:16px 0 0 0; font-size:15px; color:#ffffff;">
           <b>Numer przesyłki:</b> ${trackingNumber}
         </p>`
      : "";

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
        .pad-title { padding: 24px 16px 8px 16px !important; }
        .title-text { font-size: 19px !important; }
        .cta-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#1a1a1a; font-family:'Inter', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-wrapper" style="max-width:600px; width:100%; background-color:#2b2b2b; border-radius:18px; overflow:hidden; border:1px solid #4a4a4a;">

          <tr>
            <td style="background-color:#000000; padding:24px 32px; text-align:center;">
              <span style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#ffffff; text-transform:uppercase;">
                BRAND<span style="color:#ff5e00;">-TOP</span>
              </span>
            </td>
          </tr>

          <tr>
            <td class="pad-title" style="padding:32px 32px 8px 32px;">
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#ff5e00; background-color:rgba(255,94,0,0.12); padding:4px 10px; border-radius:20px;">
                ${statusLabel}
              </span>
              <h1 class="title-text" style="margin:14px 0 0 0; font-size:22px; font-weight:900; color:#ffffff; text-transform:uppercase; letter-spacing:-0.3px;">
                ${heading}
              </h1>
              <div style="height:4px; width:56px; background-color:#ff5e00; border-radius:2px; margin-top:8px;"></div>
              <p style="margin:16px 0 0 0; font-size:14px; color:#cccccc; line-height:20px;">
                Zamówienie <strong style="color:#ffffff;">#${order.id}</strong>. ${bodyText}
              </p>
              ${trackingHtml}
            </td>
          </tr>

          ${
            siteUrl
              ? `<tr><td class="pad-outer" style="padding:28px 32px 8px 32px;" align="center">
                  <a href="${siteUrl}/account?tab=zamowienia" target="_blank" class="cta-button"
                     style="display:inline-block; background-color:#ff5e00; color:#000000; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; text-decoration:none; padding:14px 32px; border-radius:30px;">
                    Zobacz zamówienie
                  </a>
                </td></tr>`
              : ""
          }

          <tr>
            <td class="pad-outer" style="padding:28px 32px 24px 32px; border-top:1px solid #4a4a4a;">
              <p style="margin:0; font-size:12px; line-height:20px; color:#999999; text-align:center;">
                Masz pytania? Odpisz na tego maila — chętnie pomożemy.
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
      subject: `${heading} — zamówienie #${order.id}`,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    console.error("SendGrid error (zmiana statusu):", await res.text());
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}