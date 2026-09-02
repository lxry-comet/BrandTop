// src/components/Checkout/Checkout.jsx
//
// Zakłada istniejące konwencje projektu: klas-komponenty, CSS Modules,
// HOC do wstrzyknięcia useNavigate (jak w innych komponentach z routingiem).
// Dostosuj import supabase / cartService do realnych ścieżek w projekcie.

import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCart } from "@/lib/favoritesCartService";
import css from "./Checkout.module.css";

class Checkout extends React.Component {
  state = {
    loading: true,
    submitting: false,
    error: null,
    address: null,
    shippingMethods: [],
    selectedShippingId: null,
    cartItems: [],
    selectedCartItemIds: [], // które pozycje koszyka klient chce faktycznie zamówić
  };

  async componentDidMount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        this.props.navigate("/");
        return;
      }

      const [{ data: address }, { data: shippingMethods }, cartItems] = await Promise.all([
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .maybeSingle(),
        supabase
          .from("shipping_methods")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true }),
        getCart(user.id),
      ]);

      this.setState({
        address,
        shippingMethods: shippingMethods || [],
        selectedShippingId: shippingMethods?.[0]?.id ?? null,
        cartItems: cartItems || [],
        selectedCartItemIds: (cartItems || []).map((i) => i.id), // domyślnie: cały koszyk
        loading: false,
      });
    } catch (err) {
      console.error(err);
      this.setState({ error: "Nie udało się załadować danych zamówienia.", loading: false });
    }
  }

  isAddressComplete = () => {
    const { address } = this.state;
    return !!(address && address.city && address.street && address.house_number);
  };

  handleSelectShipping = (id) => {
    this.setState({ selectedShippingId: id });
  };

  toggleCartItem = (itemId) => {
    this.setState((prev) => {
      const isSelected = prev.selectedCartItemIds.includes(itemId);
      return {
        selectedCartItemIds: isSelected
          ? prev.selectedCartItemIds.filter((id) => id !== itemId)
          : [...prev.selectedCartItemIds, itemId],
      };
    });
  };

  getSelectedItems = () => {
    const { cartItems, selectedCartItemIds } = this.state;
    return cartItems.filter((i) => selectedCartItemIds.includes(i.id));
  };

  handlePay = async () => {
    if (!this.isAddressComplete()) {
      this.props.navigate("/account?tab=adres");
      return;
    }

    const selectedItems = this.getSelectedItems();
    if (!selectedItems.length) {
      this.setState({ error: "Wybierz przynajmniej jeden produkt do zamówienia." });
      return;
    }

    this.setState({ submitting: true, error: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          shippingMethodId: this.state.selectedShippingId,
          items: selectedItems.map((i) => ({
            productId: i.product?.id,
            size: i.size,
            quantity: i.quantity,
          })),
          // ID wierszy w cart_items — webhook usunie je z koszyka DOPIERO po
          // potwierdzonej płatności, żeby nieudana/porzucona płatność nie
          // czyściła koszyka na pusto.
          cartItemIds: selectedItems.map((i) => i.id),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || data?.error) {
        this.setState({
          error: data?.error || "Nie udało się rozpocząć płatności.",
          submitting: false,
        });
        return;
      }

      window.location.href = data.url; // przekierowanie do Stripe Checkout
    } catch (err) {
      console.error(err);
      this.setState({ error: "Błąd połączenia z serwerem płatności.", submitting: false });
    }
  };

  render() {
    const {
      loading, submitting, error, address, shippingMethods,
      selectedShippingId, cartItems, selectedCartItemIds,
    } = this.state;

    if (loading) return <div className={css.loading}>Ładowanie…</div>;

    const addressOk = this.isAddressComplete();
    const shippingPrice =
      shippingMethods.find((m) => m.id === selectedShippingId)?.price ?? 0;
    const selectedItems = this.getSelectedItems();
    const itemsTotal = selectedItems.reduce(
      (sum, i) => sum + Number(i.product?.price_pln || 0) * (i.quantity || 1),
      0
    );

    return (
      <div className={css.checkout}>
        <h1 className={css.title}>Podsumowanie zamówienia</h1>

        <section className={css.section}>
          <h2>Produkty do zamówienia</h2>
          {cartItems.map((item) => {
            const checked = selectedCartItemIds.includes(item.id);
            return (
              <label key={item.id} className={css.itemRow}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => this.toggleCartItem(item.id)}
                />
                <span className={css.itemName}>
                  {item.product?.name || "Produkt"}
                  {item.size ? ` (rozm. ${item.size})` : ""} × {item.quantity}
                </span>
                <span className={css.itemPrice}>
                  {(Number(item.product?.price_pln || 0) * (item.quantity || 1)).toFixed(2)} zł
                </span>
              </label>
            );
          })}
          {cartItems.length === 0 && (
            <p className={css.paymentNote}>Koszyk jest pusty.</p>
          )}
        </section>

        <section className={css.section}>
          <h2>Adres dostawy</h2>
          {addressOk ? (
            <p className={css.addressBox}>
              {address.city}, ul. {address.street} {address.house_number}
              {address.apartment ? `/${address.apartment}` : ""}
              <br />
              {address.zip_code}
            </p>
          ) : (
            <div className={css.addressWarning}>
              <p>Brak pełnego adresu dostawy (miasto, ulica, numer domu).</p>
              <button
                className={css.linkButton}
                onClick={() => this.props.navigate("/account?tab=adres")}
              >
                Uzupełnij adres
              </button>
            </div>
          )}
        </section>

        <section className={css.section}>
          <h2>Metoda dostawy</h2>
          {shippingMethods.map((method) => (
            <label key={method.id} className={css.shippingOption}>
              <input
                type="radio"
                name="shipping"
                checked={selectedShippingId === method.id}
                onChange={() => this.handleSelectShipping(method.id)}
              />
              {method.name} — {method.price.toFixed(2)} zł
            </label>
          ))}
        </section>

        <section className={css.section}>
          <h2>Metoda płatności</h2>
          <p className={css.paymentNote}>
            Karta lub BLIK — wybierzesz dokładną metodę na stronie płatności Stripe.
          </p>
        </section>

        <div className={css.summary}>
          <div>Produkty ({selectedItems.length}): {itemsTotal.toFixed(2)} zł</div>
          <div>Dostawa: {shippingPrice.toFixed(2)} zł</div>
          <div className={css.summaryTotal}>
            Razem: {(itemsTotal + shippingPrice).toFixed(2)} zł
          </div>
        </div>

        {error && <p className={css.error}>{error}</p>}

        <button
          className={css.payButton}
          disabled={submitting || !addressOk || selectedItems.length === 0}
          onClick={this.handlePay}
        >
          {submitting ? "Przekierowanie…" : "Zapłać"}
        </button>
      </div>
    );
  }
}

export default Checkout;