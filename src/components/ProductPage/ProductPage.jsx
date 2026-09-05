import React, { Component } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient.js'
import { addToCart, toggleFavorite } from '@/lib/favoritesCartService.js'
import { AuthModal } from '@/components/AuthModal/AuthModal.jsx'
import css from './ProductPage.module.css'

const HEART_SVG = (
	<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
	</svg>
)

const PLACEHOLDER_IMG = 'https://placehold.co/400x400?text=Brand-Top'

// Товар зараз не має ні заповненого image_url, ні gallery в базі — фото лежать
// у public/image/<SKU>.jpg (те саме рішення, що в CatalogGrid). Якщо колись
// зʼявиться реальний gallery (масив кількох фото), він матиме пріоритет.
function buildGallery(product) {
	if (product.gallery && product.gallery.length) return product.gallery
	if (product.image_url) return [product.image_url]
	if (product.sku) return [`${import.meta.env.BASE_URL}image/${product.sku}.jpg`]
	return [PLACEHOLDER_IMG]
}

// Порядок для "буквених" розмірів одягу. Розміри взуття (числові, EU) сортуються окремо, як числа.
// Це і робить вибір розміру "автономним" — компонент не питає "це куртка чи кросівки",
// він просто дивиться, з чого складаються product_sizes, і сортує відповідно.
const CLOTHING_SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL']

function sortSizes(sizes) {
	const list = sizes || []
	const allNumeric = list.every((s) => s.size !== null && s.size !== '' && !isNaN(parseFloat(s.size)))

	if (allNumeric) {
		return [...list].sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
	}

	return [...list].sort((a, b) => {
		const ia = CLOTHING_SIZE_ORDER.indexOf(String(a.size).toUpperCase())
		const ib = CLOTHING_SIZE_ORDER.indexOf(String(b.size).toUpperCase())
		if (ia === -1 && ib === -1) return String(a.size).localeCompare(String(b.size))
		if (ia === -1) return 1
		if (ib === -1) return -1
		return ia - ib
	})
}

// Динамічно збираємо характеристики товару, використовуючи тільки ті поля,
// які реально є в записі — так таблиця "Szczegóły produktu" однаково коректно
// виглядає і для кросівок, і для курток, і для аксесуарів.
function buildSpecs(product) {
	const specs = []
	if (product.brand) specs.push(['Marka', product.brand])
	if (product.model) specs.push(['Model', product.model])
	if (product.category) specs.push(['Kategoria', product.category])
	if (product.gender) specs.push(['Płeć', product.gender])
	if (product.season) specs.push(['Sezon', product.season])
	if (Array.isArray(product.color) && product.color.length) specs.push(['Kolor', product.color.join(', ')])
	else if (product.color) specs.push(['Kolor', product.color])
	if (product.sku) specs.push(['SKU', product.sku])
	return specs
}

const ADD_TO_CART_NOTICE = 'Zaloguj się lub załóż konto, aby dodać produkt do koszyka.'
const ADD_TO_FAVORITES_NOTICE = 'Zaloguj się lub załóż konto, aby dodać produkt do ulubionych.'

class ProductPage extends Component {
	state = {
		product: null,
		loading: true,
		error: null,
		mainImageIndex: 0,
		selectedSize: null,
		sizeWarning: false,
		userId: null,
		liked: false,
		favError: '',
		added: false,
		addingToCart: false,
		cartError: '',
		authAlertOpen: false,
		// Który przycisk otworzył AuthModal — po zalogowaniu trzeba dokończyć
		// dokładnie tę akcję (dodanie do koszyka albo do ulubionych), a nie zawsze koszyk.
		authIntent: 'cart',
	}

	componentDidMount() {
		this.fetchProduct()
		this.loadUserAndFavoriteStatus()
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	// Sprawdza, czy ten produkt jest już w ulubionych zalogowanego usera —
	// bez tego serce zawsze startowałoby jako puste, nawet jeśli produkt
	// był wcześniej polubiony w katalogu.
	loadUserAndFavoriteStatus = async () => {
		const { data: { user } } = await supabase.auth.getUser()
		this.setState({ userId: user?.id ?? null })
		if (!user) return

		const { data, error } = await supabase
			.from('favorites')
			.select('id')
			.eq('user_id', user.id)
			.eq('product_id', this.props.id)
			.maybeSingle()

		if (!error) this.setState({ liked: Boolean(data) })
	}

	fetchProduct = async () => {
		const { id } = this.props
		this.setState({ loading: true, error: null })

		const { data, error } = await supabase
			.from('products')
			.select('*, product_sizes(size, stock)')
			.eq('id', id)
			.single()

		if (error || !data) {
			this.setState({ loading: false, error: error?.message || 'Nie znaleziono produktu' })
			return
		}

		this.setState({ product: data, loading: false })
	}

	getGallery = () => {
		const { product } = this.state
		if (!product) return []
		return buildGallery(product)
	}

	handleThumbClick = (idx) => {
		this.setState({ mainImageIndex: idx })
	}

	handleSelectSize = (sizeEntry) => {
		if (!sizeEntry.stock) return
		this.setState({ selectedSize: sizeEntry.size, sizeWarning: false })
	}

	// Wcześniej to był czysto lokalny toggle (this.setState liked: !liked)) —
	// serce "działało" wizualnie, ale nic nie zapisywało się w tabeli
	// `favorites`, więc znikało po odświeżeniu i nie pojawiało się na stronie
	// "Ulubione". Teraz zachowuje się dokładnie jak serce w CatalogGrid.jsx.
	handleToggleFav = async () => {
		const { userId, liked } = this.state
		const { id } = this.props

		if (!userId) {
			this.setState({ authAlertOpen: true, authIntent: 'favorite' })
			return
		}

		// Optymistyczna zmiana — serce reaguje natychmiast, rollback przy błędzie.
		this.setState({ liked: !liked, favError: '' })

		try {
			await toggleFavorite(userId, id)
		} catch (error) {
			this.setState({ liked, favError: error?.message || 'Nie udało się zaktualizować ulubionych.' })
		}
	}

	// Sprawdza, czy klient jest zalogowany, zanim faktycznie zapisze coś w bazie.
	// Jeśli nie — otwiera AuthModal ze stylizowanym komunikatem (props.notice) zamiast
	// standardowego "Zaloguj się" i po udanym logowaniu/rejestracji sam ponawia dodanie
	// do koszyka (handleAuthSuccess), więc klient nie musi klikać "Dodaj do koszyka" drugi raz.
	handleAddToCart = async () => {
		const { product, selectedSize } = this.state
		const sizes = sortSizes(product?.product_sizes)

		if (sizes.length && !selectedSize) {
			this.setState({ sizeWarning: true })
			return
		}

		this.setState({ addingToCart: true, cartError: '' })

		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			this.setState({ addingToCart: false, authAlertOpen: true, authIntent: 'cart' })
			return
		}

		try {
			await addToCart(user.id, product.id, selectedSize, 1)
			this.setState({ addingToCart: false, added: true, userId: user.id })
			setTimeout(() => this.setState({ added: false }), 1600)
		} catch (error) {
			this.setState({ addingToCart: false, cartError: error?.message || 'Nie udało się dodać produktu do koszyka.' })
		}
	}

	closeAuthAlert = () => this.setState({ authAlertOpen: false })

	// Po udanym zalogowaniu/rejestracji z alertu — od razu dokańcza przerwaną
	// akcję: dodanie do koszyka albo do ulubionych, w zależności co ją otworzyło.
	handleAuthSuccess = (user) => {
		const { authIntent } = this.state
		this.setState({ authAlertOpen: false, userId: user?.id ?? this.state.userId }, () => {
			if (authIntent === 'favorite') this.handleToggleFav()
			else this.handleAddToCart()
		})
	}

	render() {
		const { navigate } = this.props
		const {
			product, loading, error, mainImageIndex, selectedSize, sizeWarning, liked, favError,
			added, addingToCart, cartError, authAlertOpen, authIntent,
		} = this.state

		if (loading) {
			return (
				<div className={css.page}>
					<p className={css.statusText}>Ładowanie produktu...</p>
				</div>
			)
		}

		if (error || !product) {
			return (
				<div className={css.page}>
					<p className={css.statusText}>Nie udało się znaleźć tego produktu.</p>
					<button className={css.backBtn} onClick={() => navigate('/catalog')}>← Do katalogu</button>
				</div>
			)
		}

		const gallery = this.getGallery()
		const sizes = sortSizes(product.product_sizes)
		const specs = buildSpecs(product)
		// Kolumny w bazie to price_pln / old_price_pln (nie price / oldPrice) —
		// to był powód, dla którego cena w ogóle się nie wyświetlała.
		const price = product.price_pln
		const oldPrice = product.old_price_pln
		const hasDiscount = Boolean(oldPrice)

		return (
			<div className={css.page}>
				<div className={css.topNav}>
					<button className={css.backBtn} onClick={() => navigate('/')}>← Strona główna</button>
					<button className={css.btnOutline} onClick={() => navigate('/catalog')}>← Do katalogu</button>
				</div>

				<div className={css.productDetail}>
					<div className={css.gallery}>
						<div className={css.galleryRow}>
							<div className={css.thumbnails}>
								{gallery.map((img, idx) => (
									<img
										key={idx}
										src={img}
										alt={product.name}
										className={`${css.thumb} ${idx === mainImageIndex ? css.thumbActive : ''}`}
										onClick={() => this.handleThumbClick(idx)}
										onError={e => {
											e.currentTarget.src = PLACEHOLDER_IMG
										}}
									/>
								))}
							</div>
							<div className={css.mainImageWrap}>
								<img
									className={css.mainImage}
									src={gallery[mainImageIndex]}
									alt={product.name}
									onError={e => {
										e.currentTarget.src = PLACEHOLDER_IMG
									}}
								/>
							</div>
						</div>

						<div className={css.galleryActions}>
							<button className={css.btnBuy} onClick={this.handleAddToCart} disabled={addingToCart}>
								{added ? 'Dodano' : addingToCart ? 'Dodawanie...' : 'Dodaj do koszyka'}
							</button>
							{cartError && <div className={css.sizeWarning}>{cartError}</div>}
							<button className={`${css.btnFav} ${liked ? css.liked : ''}`} onClick={this.handleToggleFav}>
								<span className={css.favIconInline}>{HEART_SVG}</span> Ulubione
							</button>
							{favError && <div className={css.sizeWarning}>{favError}</div>}
						</div>
					</div>

					<div className={css.productInfo}>
						<h2>{product.brand} {product.name}</h2>

						{hasDiscount ? (
							<div className={css.price}>
								<span className={css.oldPrice}>{oldPrice} zł</span>
								<span className={css.salePrice}>{price} zł</span>
							</div>
						) : (
							<div className={css.price}>{price} zł</div>
						)}

						<div className={css.promoNotice}>
							{hasDiscount
								? `Ten produkt jest objęty promocją — oszczędzasz ${oldPrice - price} zł.`
								: 'Ten produkt nie jest objęty promocją ani rabatem.'}
						</div>

						<div className={css.deliveryBlock}>
							<div className={css.deliveryTitle}>Bezpłatny odbiór</div>
							<div className={css.deliverySub}>Znajdź sklep</div>
						</div>

						{product.description && <p className={css.description}>{product.description}</p>}

						{sizes.length > 0 && (
							<div>
								<div className={css.sizeHeading}>Wybierz rozmiar</div>
								<div className={css.sizeSelector}>
									{sizes.map((s) => (
										<span
											key={s.size}
											className={[
												css.sizeOption,
												selectedSize === s.size ? css.sizeSelected : '',
												s.stock ? '' : css.sizeDisabled,
											].join(' ')}
											onClick={() => this.handleSelectSize(s)}
										>
											{s.size}
										</span>
									))}
								</div>
								{sizeWarning && <div className={css.sizeWarning}>Wybierz rozmiar, aby dodać do koszyka</div>}
							</div>
						)}

						{specs.length > 0 && (
							<div className={css.accWrap}>
								<details className={css.accItem}>
									<summary>Szczegóły produktu</summary>
									<div className={css.accBody}>
										<table className={css.specsTable}>
											<tbody>
												{specs.map(([label, value]) => (
													<tr key={label}>
														<td>{label}</td>
														<td>{value}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</details>
								{/* WYSYŁKA I ZWROTY
								<details className={css.accItem}> 
									<summary>Wysyłka i zwroty</summary>
									<div className={css.accBody}>
										Darmowa dostawa od 200 zł. Bezpłatny zwrot możliwy w ciągu 30 dni od otrzymania zamówienia.
									</div>
								</details>*/}
							</div>
						)}
					</div>
				</div>

				<AuthModal
					isOpen={authAlertOpen}
					onClose={this.closeAuthAlert}
					onAuthSuccess={this.handleAuthSuccess}
					notice={authIntent === 'favorite' ? ADD_TO_FAVORITES_NOTICE : ADD_TO_CART_NOTICE}
				/>
			</div>
		)
	}
}

// Функціональна обгортка — той самий підхід, що й для Header/CategoryNav:
// useParams/useNavigate доступні лише в функціональних компонентах,
// тому ми дістаємо їх тут і передаємо як пропси в клас-компонент.
export function ProductPageRoute() {
	const { id } = useParams()
	const navigate = useNavigate()
	// key={id} примушує компонент повністю перемонтуватись і перезавантажити дані,
	// коли зі сторінки товару переходиш на інший товар (той самий трюк, що й з Catalog key={location.search})
	return <ProductPage key={id} id={id} navigate={navigate} />
}

export default ProductPageRoute