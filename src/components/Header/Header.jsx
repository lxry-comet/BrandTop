import React, { Component } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient.js'

//? imports styles
import css from './Header.module.css'

//? imports components
import { FaHeart } from 'react-icons/fa'
import { FaUser } from 'react-icons/fa'
import { FaCartShopping, FaGear, FaMagnifyingGlass, FaCircleUser } from 'react-icons/fa6'
import CategoryNav from './CategoryNav.jsx'

// Nazwa zdarzenia, które inne komponenty (ProductPage.jsx, Cart.jsx) wysyłają
// po każdej zmianie koszyka (dodanie, zmiana ilości, usunięcie) — Header
// nasłuchuje globalnie i za każdym razem odświeża licznik, bez potrzeby
// budowania współdzielonego Context/state na poziomie App.jsx.
const CART_UPDATED_EVENT = 'brandtop:cart-updated'

export class Header extends Component {
	state = {
		showTitle: false,
		menuOpen: false,
		searchTerm: '',
		cartCount: 0
		// activeIndexNavLinks: 0
	}
	interval = null
	componentDidMount() {
		this.interval = setInterval(() => {
			this.setState(prev => ({ showTitle: !prev.showTitle }))
		}, 3000)
		this.fetchCartCount()
		window.addEventListener(CART_UPDATED_EVENT, this.fetchCartCount)
	}
	componentDidUpdate(prevProps) {
		// Po zalogowaniu/wylogowaniu (this.props.user się zmienia) licznik
		// trzeba przeliczyć — inny użytkownik, inny koszyk.
		if (prevProps.user?.id !== this.props.user?.id) {
			this.fetchCartCount()
		}
	}
	componentWillUnmount() {
		clearInterval(this.interval)
		window.removeEventListener(CART_UPDATED_EVENT, this.fetchCartCount)
	}
	// Suma pola quantity ze wszystkich pozycji koszyka (nie liczba wierszy) —
	// tak żeby np. 2 szt. tego samego produktu liczyły się jako 2, nie 1.
	fetchCartCount = async () => {
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			this.setState({ cartCount: 0 })
			return
		}

		const { data, error } = await supabase
			.from('cart_items')
			.select('quantity')
			.eq('user_id', user.id)

		if (error) {
			console.error('Błąd pobierania liczby produktów w koszyku:', error)
			return
		}

		const total = (data || []).reduce((sum, row) => sum + (row.quantity || 0), 0)
		this.setState({ cartCount: total })
	}
	toggleMenu = () => {
		this.setState(prev => ({ menuOpen: !prev.menuOpen }))
	}
	closeMenu = () => {
		this.setState({ menuOpen: false })
	}
	handleSearchChange = (e) => {
		this.setState({ searchTerm: e.target.value })
	}
	handleSearchKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			this.submitSearch()
		}
	}
	// Wyszukiwanie odsyła do /catalog?search=... — Catalog.jsx odczytuje ten
	// parametr i filtruje aktualnie wczytane produkty po nazwie (analogicznie
	// do ?type=... dla kategorii i ?brand=... z BrandStrip.jsx).
	submitSearch = () => {
		const term = this.state.searchTerm.trim()
		if (!term) return
		this.closeMenu()
		const path = `/catalog?search=${encodeURIComponent(term)}`

		if (this.props.navigate) {
			this.props.navigate(path)
		} else {
			// Awaryjne rozwiązanie: jeśli ten komponent jest gdzieś użyty jako
			// `import { Header } from ...` (nazwany eksport) zamiast domyślnego
			// HeaderWithNavigate, this.props.navigate nigdy nie zostanie
			// przekazane i wyszukiwanie po cichu nic by nie robiło. Zwykłe
			// przekierowanie przeglądarki (z uwzględnieniem BASE_URL na
			// GitHub Pages) działa zawsze, kosztem pełnego przeładowania strony.
			window.location.href = `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
		}
	}
	render() {
		//! [1] Блок диструктуризації props та state

		//! [2] Блок обчислювальних дaних
		const { showTitle, menuOpen, searchTerm, cartCount } = this.state
		// Panel admina widoczny tylko w UI dla role === 'admin' — to jest
		// kosmetyka/wygoda, nie zabezpieczenie: prawdziwy zamek na zapis
		// do products/product_sizes/storage pilnuje RLS w Supabase.
		const isAdmin = this.props.user?.role === 'admin'
		const navLinks = [
			{ label: 'Główna', path: '/' },
			{ label: 'Katalog', path: '/catalog' },
			{ label: 'Wideo', path: '/wideo' },
			{ label: 'O nas', path: '/contact' }
		]
		//! [3] Блок консолей необхідних даних

		return (
			<>
				<header className={css.header}>
					<div className={css.header__container}>
						<div className={css.header__nav}>
							<Link
								to='/'
								className={css.header__logo}
								title='Strona główna'
								onClick={this.closeMenu}
							>
								<div className={css.logo__text}>
									<div
										className={`${css.logo__item} ${!showTitle ? css.active : ''}`}
									>
										<span>
											Brand
											<span className={css.accent}>-Top</span>
										</span>
									</div>
									<div
										className={`${css.logo__item} ${showTitle ? css.active : ''}`}
									>
										<span>Witaj</span>
									</div>
								</div>
							</Link>
							<div className={css.header__actions}>
								<Link
									to='/favorites'
									className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
									onClick={this.closeMenu}
								>
									<FaHeart />
								</Link>
								{this.props.user ? (
									<Link
										to='/account'
										className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
										aria-label='Moje konto'
									>
										<FaCircleUser />
										<span className={css.loggedInDot} aria-hidden='true' />
									</Link>
								) : (
									<button
										type='button'
										className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
										onClick={this.props.onAccountClick}
										aria-label='Zaloguj się'
									>
										<FaUser />
									</button>
								)}
								{isAdmin && (
									<Link
										to='/admin'
										className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
										aria-label='Panel administratora'
										title='Panel administratora'
									>
										<FaGear />
									</Link>
								)}
								<Link
									to='/cart'
									className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
									onClick={this.closeMenu}
								>
									<FaCartShopping />
									{cartCount > 0 && <span className={css.cartBadge}>{cartCount}</span>}
								</Link>
								<button
									type='button'
									className={`${css.burger__btn} ${menuOpen ? css.burger__btnOpen : ''}`}
									onClick={this.toggleMenu}
									aria-label='Menu'
									aria-expanded={menuOpen}
								>
									<span></span>
									<span></span>
									<span></span>
								</button>
							</div>
						</div>
						<div
							className={`${css.header__search} ${menuOpen ? css.header__searchOpen : ''}`}
						>
							<div className={css.mobile_actions}>
								<Link
									to='/favorites'
									className={css.mobile_actionLink}
									onClick={this.closeMenu}
								>
									<FaHeart />
									<span>Ulubione</span>
								</Link>
								<Link
									to='/cart'
									className={css.mobile_actionLink}
									onClick={this.closeMenu}
								>
									<FaCartShopping />
									<span>Koszyk{cartCount > 0 ? ` (${cartCount})` : ''}</span>
								</Link>
								{this.props.user ? (
									<Link
										to='/account'
										className={css.mobile_actionLink}
										onClick={this.closeMenu}
									>
										<FaCircleUser />
										<span>Moje konto</span>
									</Link>
								) : (
									<button
										type='button'
										className={css.mobile_actionLink}
										onClick={() => {
											this.closeMenu()
											this.props.onAccountClick && this.props.onAccountClick()
										}}
									>
										<FaUser />
										<span>Konto</span>
									</button>
								)}
								{isAdmin && (
									<Link
										to='/admin'
										className={css.mobile_actionLink}
										onClick={this.closeMenu}
									>
										<FaGear />
										<span>Panel admina</span>
									</Link>
								)}
							</div>
							<div className={css.navbar}>
								{navLinks.map(({ label, path }) => (
									<NavLink
										key={path}
										to={path}
										end={path === '/'}
										onClick={this.closeMenu}
										className={({ isActive }) =>
											`${css.nav__link} ${isActive ? css.active : ''}`
										}
									>
										{label}
									</NavLink>
								))}
							</div>
							<div className={css.search__box}>
								<button
									type='button'
									className={css.search__icon}
									onClick={this.submitSearch}
									aria-label='Szukaj'
								>
									<FaMagnifyingGlass />
								</button>
								<input
									type='text'
									id='searchInput'
									placeholder='Szukaj sneakersów...'
									value={searchTerm}
									onChange={this.handleSearchChange}
									onKeyDown={this.handleSearchKeyDown}
									autoComplete='off'
								></input>
							</div>
						</div>
						<CategoryNav />
					</div>
				</header>
			</>
		)
	}
}
// Header jest klasą i nie ma bezpośredniego dostępu do useNavigate (hooki
// działają tylko w komponentach funkcyjnych) — ten sam wzorzec HOC, co przy
// CategoryNav.jsx/ProductPageRoute: dostajemy navigate tutaj i przekazujemy
// jako prop do klasy, żeby wyszukiwarka mogła przekierować na /catalog.
function HeaderWithNavigate(props) {
	const navigate = useNavigate()
	return <Header {...props} navigate={navigate} />
}

export default HeaderWithNavigate