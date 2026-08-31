// src/components/CheckoutSuccess/CheckoutSuccess.jsx
//
// Strona, na którą Stripe przekierowuje po udanej płatności (success_url
// w create-checkout-session/index.ts). Samo zamówienie w orders/order_items
// zapisuje webhook (stripe-webhook) asynchronicznie, w tle — dlatego ta strona
// nie odpytuje bazy o konkretne zamówienie, tylko pokazuje ogólne potwierdzenie.
// Zwykle webhook zdąży zapisać zamówienie w ciągu 1-2 sekund.

import { Link } from 'react-router-dom'
import css from './CheckoutSuccess.module.css'

export default function CheckoutSuccess() {
	return (
		<div className={css.page}>
			<div className={css.card}>
				<div className={css.icon}>✓</div>
				<h1 className={css.title}>Dziękujemy za zamówienie!</h1>
				<p className={css.text}>
					Płatność przebiegła pomyślnie. Potwierdzenie zamówienia wyślemy
					na Twój adres e-mail w ciągu kilku minut.
				</p>
				<div className={css.actions}>
					<Link to="/catalog" className={css.primaryBtn}>Wróć do zakupów</Link>
					<Link to="/account?tab=zamowienia" className={css.secondaryBtn}>Moje zamówienia</Link>
				</div>
			</div>
		</div>
	)
}
