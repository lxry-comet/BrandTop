import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '@/lib/supabaseClient.js'
import { getFavorites, removeFavorite, addToCart } from '@/lib/favoritesCartService.js'
import { AuthModal } from '@/components/AuthModal/AuthModal.jsx'
import css from './Favorites.module.css'

const PLACEHOLDER_IMG = 'https://placehold.co/120x120/1a1a1a/fff?text=Brand-Top'
const LOGIN_NOTICE = 'Zaloguj się lub załóż konto, aby zobaczyć ulubione produkty.'

const HEART_PATH =
	'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09' +
	'C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

function productImage(product) {
	if (!product) return PLACEHOLDER_IMG
	if (product.image_url) return product.image_url
	if (product.sku) return `${import.meta.env.BASE_URL}image/${product.sku}.jpg`
	return PLACEHOLDER_IMG
}

// Ten komponent wcześniej trzymał favoriteProducts wyłącznie w lokalnym state
// (zawsze pusta tablica) i nigdy nie pytał Supabase — więc strona "Ulubione"
// zawsze pokazywała "Brak ulubionych produktów", nawet jeśli serduszka w
// katalogu/na stronie produktu realnie zapisały wiersze w tabeli `favorites`.
// Teraz działa dokładnie jak Cart.jsx: wymaga logowania i wczytuje prawdziwe
// dane przez favoritesCartService.js.
export class Favorites extends Component {
	state = {
		user: null,
		checkingUser: true,
		loading: false,
		favorites: [],
		error: '',
		authAlertOpen: false,
		addedId: null,
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
		this.loadFavorites(user.id)
	}

	loadFavorites = async (userId) => {
		this.setState({ loading: true, error: '' })
		try {
			const rows = await getFavorites(userId)
			this.setState({ favorites: rows || [], loading: false })
		} catch (error) {
			this.setState({ loading: false, error: error?.message || 'Nie udało się wczytać ulubionych.' })
		}
	}

	// Serce tutaj jest zawsze "zapalone" (produkt jest na tej liście, bo jest
	// ulubiony) — klik usuwa go z ulubionych, tak jak ponowne kliknięcie
	// zapalonego serca w katalogu. Optymistyczna zmiana + rollback przy błędzie,
	// ten sam wzorzec co CatalogGrid.jsx i Cart.jsx.
	handleRemove = async (row) => {
		const prevFavorites = this.state.favorites
		this.setState((prev) => ({ favorites: prev.favorites.filter((f) => f.id !== row.id) }))

		try {
			await removeFavorite(this.state.user.id, row.product.id)
		} catch (error) {
			this.setState({ favorites: prevFavorites, error: error?.message || 'Nie udało się usunąć z ulubionych.' })
		}
	}

	handleAddToCart = async (row) => {
		const { user } = this.state
		if (!user || !row.product) return

		try {
			await addToCart(user.id, row.product.id, null, 1)
			this.setState({ addedId: row.id })
			setTimeout(() => {
				this.setState((prev) => (prev.addedId === row.id ? { addedId: null } : null))
			}, 1600)
		} catch (error) {
			this.setState({ error: error?.message || 'Nie udało się dodać produktu do koszyka.' })
		}
	}

	openAuthAlert = () => this.setState({ authAlertOpen: true })
	closeAuthAlert = () => this.setState({ authAlertOpen: false })

	handleAuthSuccess = (user) => {
		this.setState({ authAlertOpen: false, user }, () => this.loadFavorites(user.id))
	}

	renderHeader() {
		return (
			<div className={css.page_header}>
				<Link to="/" className={css.back_btn}>
					← Strona główna
				</Link>
				<h2 className={css.section_title}>Ulubione</h2>
				<div className={css.header_placeholder}></div>
			</div>
		)
	}

	render() {
		const { user, checkingUser, loading, favorites, error, authAlertOpen, addedId } = this.state

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
						<div className={css.loginIconBadge}>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 20.5s-7.5-4.6-10-9.3C0.3 7.8 2 4.5 5.3 4c2-.3 3.9.6 5 2.2C11.3 4.6 13.2 3.7 15.2 4c3.3.5 5 3.8 3.3 7.2-2.5 4.7-10 9.3-10 9.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
							</svg>
						</div>
						<div className={css.loginTitle}>Zaloguj się, aby zobaczyć ulubione</div>
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

		const isEmpty = !loading && favorites.length === 0

		return (
			<div className={css.content}>
				{this.renderHeader()}

				{error && <div className={css.errorBanner}>{error}</div>}

				{loading ? (
					<p className={css.empty_text}>Ładowanie ulubionych...</p>
				) : isEmpty ? (
					<p className={css.empty_text}>Brak ulubionych produktów</p>
				) : (
					<>
						{favorites.map((row) => {
							const product = row.product || {}
							return (
								<div className={css.fav_row} key={row.id}>
									<Link to={`/product/${product.id}`} className={css.fav_imgLink}>
										<img
											src={productImage(product)}
											alt={product.name}
											onError={(e) => {
												e.target.src = PLACEHOLDER_IMG
											}}
										/>
									</Link>
									<div className={css.fav_itemDetails}>
										<Link to={`/product/${product.id}`} className={css.fav_itemName}>
											{product.name}
										</Link>
										<div className={css.fav_itemMeta}>{product.brand}</div>
									</div>
									<div className={css.fav_itemPrice}>{product.price_pln} zł</div>
									<button
										className={css.btn_addCart}
										onClick={() => this.handleAddToCart(row)}
									>
										{addedId === row.id ? 'Dodano' : 'Do koszyka'}
									</button>
									<span
										className={`${css.favIcon} ${css.liked}`}
										onClick={() => this.handleRemove(row)}
										role="button"
										aria-label="Usuń z ulubionych"
									>
										<svg className={css.heartSvg} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
											<path d={HEART_PATH} />
										</svg>
									</span>
								</div>
							)
						})}
					</>
				)}
			</div>
		)
	}
}

export default Favorites