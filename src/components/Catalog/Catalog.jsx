import React, { Component } from 'react'
import { Link } from 'react-router-dom'

//? import supabase
import { supabase } from '@/lib/supabaseClient.js'

//? imports styles
import productsStyles from '../Products/Products.module.css'
import heroStyles from '../Hero/Hero.module.css'
import catalogStyles from './Catalog.module.css'
//? imports components
import CatalogGrid from './CatalogGrid.jsx'

const css = { ...productsStyles, ...heroStyles, ...catalogStyles }

const visibleProductsCount = 8

// Płeć jest zawsze z tego samego, stałego zestawu (jak w makiecie) — nie ma
// sensu wyliczać go z danych, bo dopóki produkty nie mają jeszcze wypełnionego
// pola gender, filtr i tak musi być widoczny, żeby dało się go ustawić.
const GENDER_OPTIONS = ['Mężczyzna', 'Kobieta', 'Dziecko']

// Unikalne, niepuste wartości z tablicy pól produktów (np. gender, kind) —
// posortowane alfabetycznie po polsku.
function uniqueValues(items, getter) {
	const set = new Set()
	items.forEach(item => {
		const value = getter(item)
		if (Array.isArray(value)) {
			value.forEach(v => { if (v) set.add(v) })
		} else if (value) {
			set.add(value)
		}
	})
	return [...set].sort((a, b) => String(a).localeCompare(String(b), 'pl'))
}

// Rozmiary — jeśli wszystkie da się zinterpretować jako liczby (rozmiary
// obuwia w EU), sortujemy numerycznie; w przeciwnym razie alfabetycznie.
function uniqueSizes(items) {
	const set = new Set()
	items.forEach(p => (p.sizes || []).forEach(s => set.add(s.size)))
	const values = [...set]
	const allNumeric = values.every(v => v !== null && v !== '' && !isNaN(Number(v)))
	if (allNumeric) return values.sort((a, b) => Number(a) - Number(b))
	return values.sort((a, b) => String(a).localeCompare(String(b), 'pl'))
}

const EMPTY_FILTERS = {
	saleOnly: false,
	selectedGenders: [],
	selectedBrands: [],
	selectedSizes: [],
	selectedSeasons: [],
	selectedTypes: [],
	selectedKinds: [],
	selectedColors: []
}

export class Catalog extends Component {
	state = {
		data: [],
		loading: true,
		error: null,
		visibleCount: visibleProductsCount,
		category: new URLSearchParams(window.location.search).get('type'),

		filterPanelOpen: false,

		// "Pokaż dostępne" — istniejąca funkcja: produkt musi mieć realny rozmiar
		// na stanie ORAZ realne zdjęcie w public/image/. availableIds liczymy raz
		// (leniwie, przy pierwszym włączeniu) i trzymamy w cache, żeby przełączanie
		// filtru nie odpytywało serwera/przeglądarki za każdym razem od nowa.
		showAvailableOnly: false,
		checkingAvailability: false,
		availableIds: null,

		maxPrice: null,
		priceBounds: { min: 0, max: 0 },

		...EMPTY_FILTERS
	}

	toggleFilterPanel = () => {
		this.setState(prev => ({ filterPanelOpen: !prev.filterPanelOpen }))
	}

	componentDidMount() {
		this.fetchProducts()
	}

	async fetchProducts() {
		const { category } = this.state

		let query = supabase.from('products').select('*, product_sizes(size, stock)')
		// ilike zamiast eq — porównanie bez uwzględniania wielkości liter. Część
		// starych produktów w bazie ma type zapisany jako 'Obuwie' (wielka litera,
		// z czasów przed poprawką CategoryNav.jsx/Admin.jsx), a nowe zapisywane są
		// jako 'obuwie'. Przy dokładnym .eq() te stare rekordy w ogóle nie pasowały
        // do linku "Obuwie" — stąd 0 wyników mimo że "Wszystko" je pokazywało.
		if (category) query = query.ilike('type', category)

		const { data, error } = await query

		if (error) {
			this.setState({ error, loading: false })
			return
		}

		const mapped = data.map(item => {
			const sizes = item.product_sizes || []
			const hasStock = sizes.some(s => s.stock > 0)
			const oldPrice = item.old_price_pln ?? null
			const price = item.price_pln
			const discount = oldPrice && price != null && oldPrice > price
				? `-${Math.round((1 - price / oldPrice) * 100)}%`
				: null

			return {
				id: item.id,
				name: item.name,
				price,
				oldPrice,
				discount,
				img: item.image_url,
				sku: item.sku,
				brand: item.brand,
				model: item.model,
				sizes,
				hasStock,
				gender: item.gender || [],
				season: item.season || null,
				productType: item.product_type || [],
				kind: item.kind || [],
				color: item.color || []
			}
		})

		const prices = mapped.map(p => p.price).filter(p => p != null)
		const priceBounds = {
			min: prices.length ? Math.min(...prices) : 0,
			max: prices.length ? Math.max(...prices) : 0
		}

		this.setState({
			data: mapped,
			loading: false,
			priceBounds,
			maxPrice: priceBounds.max
		})
	}

	// Фото в базі не позначені (image_url майже завжди null), файли лежать
	// статично в public/image/<SKU>.jpg. Єдиний надійний спосіб дізнатись,
	// чи фото реально є, — спробувати його завантажити в браузері.
	checkImageExists = (sku) => {
		return new Promise(resolve => {
			if (!sku) {
				resolve(false)
				return
			}
			const img = new Image()
			img.onload = () => resolve(true)
			img.onerror = () => resolve(false)
			img.src = `${import.meta.env.BASE_URL}image/${sku}.jpg`
		})
	}

	handleToggleAvailable = async () => {
		const nextValue = !this.state.showAvailableOnly

		if (nextValue && this.state.availableIds === null) {
			this.setState({ checkingAvailability: true })

			const candidates = this.state.data.filter(p => p.hasStock)
			const results = await Promise.all(
				candidates.map(async p => ({ id: p.id, hasPhoto: await this.checkImageExists(p.sku) }))
			)
			const availableIds = new Set(results.filter(r => r.hasPhoto).map(r => r.id))

			this.setState({ availableIds, checkingAvailability: false })
		}

		this.setState({ showAvailableOnly: nextValue, visibleCount: visibleProductsCount })
	}

	// Uniwersalny toggle dla wszystkich wielokrotnego wyboru grup chipów
	// (Płeć/Marka/Rozmiar/Sezon/Typ/Rodzaj/Kolor) — jedna funkcja zamiast
	// siedmiu prawie identycznych.
	toggleFilterValue = (field, value) => {
		this.setState(prev => {
			const current = prev[field]
			const has = current.includes(value)
			return {
				[field]: has ? current.filter(v => v !== value) : [...current, value],
				visibleCount: visibleProductsCount
			}
		})
	}

	toggleSaleOnly = () => {
		this.setState(prev => ({ saleOnly: !prev.saleOnly, visibleCount: visibleProductsCount }))
	}

	handlePriceChange = (event) => {
		this.setState({ maxPrice: Number(event.target.value), visibleCount: visibleProductsCount })
	}

	resetFilters = () => {
		this.setState({ ...EMPTY_FILTERS, maxPrice: this.state.priceBounds.max, visibleCount: visibleProductsCount })
	}

	getFilterOptions() {
		const { data } = this.state
		return {
			brands: uniqueValues(data, p => p.brand),
			sizes: uniqueSizes(data),
			seasons: uniqueValues(data, p => p.season),
			types: uniqueValues(data, p => p.productType),
			kinds: uniqueValues(data, p => p.kind),
			colors: uniqueValues(data, p => p.color)
		}
	}

	getFilteredProducts() {
		const {
			data, showAvailableOnly, availableIds, saleOnly,
			selectedGenders, selectedBrands, selectedSizes, selectedSeasons,
			selectedTypes, selectedKinds, selectedColors, maxPrice
		} = this.state

		return data.filter(p => {
			if (showAvailableOnly && availableIds && !availableIds.has(p.id)) return false
			if (saleOnly && !p.oldPrice) return false
			if (selectedGenders.length && !selectedGenders.some(g => p.gender.includes(g))) return false
			if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false
			if (selectedSizes.length) {
				const hasSelectedSize = p.sizes.some(s => s.stock > 0 && selectedSizes.includes(s.size))
				if (!hasSelectedSize) return false
			}
			if (selectedSeasons.length && !selectedSeasons.includes(p.season)) return false
			if (selectedTypes.length && !selectedTypes.some(t => p.productType.includes(t))) return false
			if (selectedKinds.length && !selectedKinds.some(k => p.kind.includes(k))) return false
			if (selectedColors.length && !selectedColors.some(c => p.color.includes(c))) return false
			if (maxPrice != null && p.price != null && p.price > maxPrice) return false
			return true
		})
	}

	renderChipGroup(label, field, options) {
		if (!options.length) return null
		const selected = this.state[field]

		return (
			<div className={css.filterGroup}>
				<label>{label}</label>
				<div className={css.chipContainer}>
					{options.map(opt => (
						<span
							key={opt}
							className={`${css.chip}${selected.includes(opt) ? ' ' + css.chipSelected : ''}`}
							onClick={() => this.toggleFilterValue(field, opt)}
						>
							{opt}
						</span>
					))}
				</div>
			</div>
		)
	}

	render() {
		const {
			loading, error, checkingAvailability, showAvailableOnly, filterPanelOpen,
			category, saleOnly, maxPrice, priceBounds
		} = this.state

		const filtered = this.getFilteredProducts()
		const visibleProducts = filtered.slice(0, this.state.visibleCount)
		const { brands, sizes, seasons, types, kinds, colors } = this.getFilterOptions()

		const activeFilterCount =
			(saleOnly ? 1 : 0) +
			(showAvailableOnly ? 1 : 0) +
			this.state.selectedGenders.length +
			this.state.selectedBrands.length +
			this.state.selectedSizes.length +
			this.state.selectedSeasons.length +
			this.state.selectedTypes.length +
			this.state.selectedKinds.length +
			this.state.selectedColors.length +
			(maxPrice != null && maxPrice < priceBounds.max ? 1 : 0)

		const sizeLabel = category === 'obuwie' ? 'Rozmiar (EU)' : 'Rozmiar'

		return (
			<>
				<div className={`${css.products} ${filterPanelOpen ? css.catalogShifted : ''}`}>
					<div className={css.catalogWrapper}>
						<Link to="/" className={css.catalog_btn}>
							← Strona główna
						</Link>
						<h3 className={css.catalog_title}>Wszystkie produkty</h3>
						<button className={css.catalog_FilterBtn} onClick={this.toggleFilterPanel}>
							Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
						</button>
					</div>

					{loading && <p>Ładowanie produktów...</p>}
					{error && <p>Błąd wczytywania produktów: {error.message}</p>}
					{!loading && !error && filtered.length === 0 && (
						<p className={css.emptyText}>
							{checkingAvailability ? 'Sprawdzanie dostępności...' : 'Nic nie znaleziono dla wybranych filtrów.'}
						</p>
					)}
					{!loading && !error && filtered.length > 0 && (
						<>
							<CatalogGrid products={visibleProducts} />
							{filtered.length > this.state.visibleCount && (
								<div
									className={css.products__btn}
									onClick={() =>
										this.setState(prev => ({
											visibleCount: prev.visibleCount + visibleProductsCount
										}))
									}
								>
									Zobacz więcej
								</div>
							)}
						</>
					)}
				</div>

				{filterPanelOpen && (
					<div className={css.filterOverlay} onClick={this.toggleFilterPanel} />
				)}

				<div className={`${css.filterPanel}${filterPanelOpen ? ' ' + css.filterPanelOpen : ''}`}>
					<h3>Filtry</h3>

					<div className={css.filterGroup}>
						<label>Dostępność i zniżki</label>
						<div className={css.chipContainer}>
							<span
								className={`${css.chip}${showAvailableOnly ? ' ' + css.chipSelected : ''}`}
								onClick={this.handleToggleAvailable}
							>
								{checkingAvailability ? 'Sprawdzanie...' : 'Tylko dostępne'}
							</span>
							<span
								className={`${css.chip} ${css.chipSale}${saleOnly ? ' ' + css.chipSelected : ''}`}
								onClick={this.toggleSaleOnly}
							>
								Tylko zniżki
							</span>
						</div>
					</div>

					{this.renderChipGroup('Płeć', 'selectedGenders', GENDER_OPTIONS)}
					{this.renderChipGroup('Marka', 'selectedBrands', brands)}
					{sizes.length > 0 && (
						<div className={css.filterGroup}>
							<label>{sizeLabel}</label>
							<div className={css.chipContainer}>
								{sizes.map(size => (
									<span
										key={size}
										className={`${css.chip}${this.state.selectedSizes.includes(size) ? ' ' + css.chipSelected : ''}`}
										onClick={() => this.toggleFilterValue('selectedSizes', size)}
									>
										{size}
									</span>
								))}
							</div>
						</div>
					)}
					{this.renderChipGroup('Sezon', 'selectedSeasons', seasons)}
					{this.renderChipGroup('Typ', 'selectedTypes', types)}
					{this.renderChipGroup('Rodzaj', 'selectedKinds', kinds)}
					{this.renderChipGroup('Kolor', 'selectedColors', colors)}

					{priceBounds.max > priceBounds.min && (
						<div className={css.filterGroup}>
							<label>Cena (zł)</label>
							<input
								type="range"
								min={priceBounds.min}
								max={priceBounds.max}
								value={maxPrice ?? priceBounds.max}
								aria-label="Maksymalna cena w złotych"
								onChange={this.handlePriceChange}
							/>
							<div className={css.priceRangeDisplay}>
								<span>{priceBounds.min} zł</span>
								<span>{maxPrice ?? priceBounds.max} zł</span>
							</div>
						</div>
					)}

					<button className={css.applyBtn} onClick={this.toggleFilterPanel}>
						Pokaż wyniki ({filtered.length})
					</button>
					{activeFilterCount > 0 && (
						<button className={css.resetBtn} onClick={this.resetFilters}>
							Wyczyść filtry
						</button>
					)}
				</div>
			</>
		)
	}
}
export default Catalog