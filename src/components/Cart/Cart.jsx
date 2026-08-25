import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '@/lib/supabaseClient.js'
import { getCart, updateCartItemQuantity, removeCartItem, completeOrder } from '@/lib/favoritesCartService.js'
import { AuthModal } from '@/components/AuthModal/AuthModal.jsx'
import css from './Cart.module.css'

const PLACEHOLDER_IMG = 'https://placehold.co/120x120/1a1a1a/fff?text=Brand-Top'
const LOGIN_NOTICE = 'Zaloguj się lub załóż konto, aby zobaczyć swój koszyk.'

function productImage(product) {
	if (!product) return PLACEHOLDER_IMG
	if (product.image_url) return product.image_url
	if (product.sku) return `${import.meta.env.BASE_URL}image/${product.sku}.jpg`
	return PLACEHOLDER_IMG
}

export class Cart extends Component {
	state = {
		user: null,
		checkingUser: true,
		loading: false,
		cartItems: [],
		error: '',
		completing: false,
		orderSuccess: null,
		authAlertOpen: false,
	}

	componentDidMount() {
		this.loadUser()
	}

	loadUser = async () => {
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			this.setState({ user: null, checkingUser: false })
			return
		}

		this.setState({ user, checkingUser: false })
		this.loadCart(user.id)
	}

	loadCart = async (userId) => {
		this.setState({ loading: true, error: '' })
		try {
			const items = await getCart(userId)
			this.setState({ cartItems: items || [], loading: false })
		} catch (error) {
			this.setState({ loading: false, error: error?.message || 'Nie udało się wczytać koszyka.' })
		}
	}

	getTotal = () => {
		const { cartItems } = this.state
		return cartItems.reduce(
			(sum, item) => sum + Number(item.product?.price_pln || 0) * (item.quantity || 1),
			0
		)
	}

	// Optymistyczna zmiana ilości — od razu widać efekt w UI, a w razie błędu
	// z Supabase wracamy do poprzedniego stanu i pokazujemy komunikat.
	handleChangeQty = async (item, delta) => {
		const nextQty = (item.quantity || 1) + delta
		if (nextQty < 1) {
			this.handleRemove(item)
			return
		}

		const prevItems = this.state.cartItems
		this.setState((prev) => ({
			cartItems: prev.cartItems.map((ci) => (ci.id === item.id ? { ...ci, quantity: nextQty } : ci)),
		}))

		try {
			await updateCartItemQuantity(item.id, nextQty)
		} catch (error) {
			this.setState({ cartItems: prevItems, error: error?.message || 'Nie udało się zaktualizować ilości.' })
		}
	}

	handleRemove = async (item) => {
		const prevItems = this.state.cartItems
		this.setState((prev) => ({ cartItems: prev.cartItems.filter((ci) => ci.id !== item.id) }))

		try {
			await removeCartItem(item.id)
		} catch (error) {
			this.setState({ cartItems: prevItems, error: error?.message || 'Nie udało się usunąć produktu z koszyka.' })
		}
	}

	handleCompleteOrder = async () => {
		const { user, cartItems } = this.state
		if (!user || !cartItems.length) return

		this.setState({ completing: true, error: '' })

		try {
			const order = await completeOrder(user.id, cartItems)
			this.setState({ completing: false, cartItems: [], orderSuccess: order })
		} catch (error) {
			this.setState({ completing: false, error: error?.message || 'Nie udało się złożyć zamówienia.' })
		}
	}

	openAuthAlert = () => this.setState({ authAlertOpen: true })
	closeAuthAlert = () => this.setState({ authAlertOpen: false })

	handleAuthSuccess = (user) => {
		this.setState({ authAlertOpen: false, user }, () => this.loadCart(user.id))
	}

	renderHeader() {
		return (
			<div className={css.page_header}>
				<Link to="/" className={css.back_btn}>
					← Strona główna
				</Link>
				<h2 className={css.section_title}>Koszyk</h2>
				<div className={css.header_placeholder}></div>
			</div>
		)
	}

	render() {
		const {
			user, checkingUser, loading, cartItems, error,
			completing, orderSuccess, authAlertOpen,
		} = this.state

		if (checkingUser) {
			return (
				<div className={css.content}>
					{this.renderHeader()}
					<p className={css.empty_text}>Ładowanie...</p>
				</div>
			)
		}

		if (!user) {
			return (
				<div className={css.content}>
					{this.renderHeader()}
					<div className={css.loginCard}>
						<div className={css.loginTitle}>Zaloguj się, aby zobaczyć koszyk</div>
						<p className={css.loginText}>{LOGIN_NOTICE}</p>
						<button className={css.loginBtn} onClick={this.openAuthAlert}>
							Zaloguj się / Zarejestruj się
						</button>
					</div>
					<AuthModal
						isOpen={authAlertOpen}
						onClose={this.closeAuthAlert}
						onAuthSuccess={this.handleAuthSuccess}
						notice={LOGIN_NOTICE}
					/>
				</div>
			)
		}

		if (orderSuccess) {
			return (
				<div className={css.content}>
					{this.renderHeader()}
					<div className={css.successCard}>
						<div className={css.successTitle}>Zamówienie złożone!</div>
						<p className={css.successText}>
							Numer zamówienia #{orderSuccess.id} na kwotę {orderSuccess.total} zł. Dziękujemy za zakupy!
						</p>
						<div className={css.successActions}>
							<Link to="/catalog" className={css.loginBtn}>Wróć do zakupów</Link>
							<Link to="/account" className={css.back_btn}>Moje zamówienia</Link>
						</div>
					</div>
				</div>
			)
		}

		const isEmpty = !loading && cartItems.length === 0

		return (
			<div className={css.content}>
				{this.renderHeader()}

				{error && <div className={css.errorBanner}>{error}</div>}

				{loading ? (
					<p className={css.empty_text}>Ładowanie koszyka...</p>
				) : isEmpty ? (
					<p className={css.empty_text}>Koszyk jest pusty</p>
				) : (
					<>
						{cartItems.map((item) => {
							const product = item.product || {}
							const unitPrice = Number(product.price_pln || 0)
							const lineTotal = unitPrice * (item.quantity || 1)

							return (
								<div className={css.cart_row} key={item.id}>
									<img
										src={productImage(product)}
										alt={product.name}
										onError={(e) => {
											e.target.src = PLACEHOLDER_IMG
										}}
									/>
									<div className={css.cart_itemDetails}>
										<div className={css.cart_itemName}>{product.name}</div>
										<div className={css.cart_itemMeta}>
											{product.brand}
											{item.size ? ` · Rozmiar: ${item.size}` : ''}
											<span className={css.qty_control}>
												<button onClick={() => this.handleChangeQty(item, -1)}>−</button>
												<span>{item.quantity || 1}</span>
												<button onClick={() => this.handleChangeQty(item, 1)}>+</button>
											</span>
										</div>
									</div>
									<div className={css.cart_itemPrice}>{lineTotal} zł</div>
									<button className={css.rm_btn} onClick={() => this.handleRemove(item)} title="Usuń z koszyka">
										✕
									</button>
								</div>
							)
						})}

						<div className={css.cart_total}>Razem: {this.getTotal()} zł</div>
						<button className={css.btn_buy} onClick={this.handleCompleteOrder} disabled={completing}>
							{completing ? 'Składanie zamówienia...' : 'Kup teraz'}
						</button>
					</>
				)}
			</div>
		)
	}
}

export default Cart
