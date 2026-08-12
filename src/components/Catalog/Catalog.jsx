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

export class Catalog extends Component {
	state = {
		data: [],
		loading: true,
		error: null,
		visibleCount: visibleProductsCount,
		filterPanelOpen: false,
		showAvailableOnly: false,
		checkingAvailability: false,
		availableProducts: []
	}

	toggleFilterPanel = () => {
		this.setState(prev => ({ filterPanelOpen: !prev.filterPanelOpen }))
	}

	componentDidMount() {
		this.fetchProducts()
	}

	
	async fetchProducts() {
		
		const type = new URLSearchParams(window.location.search).get('type')

		let query = supabase.from('products').select('*, product_sizes(size, stock)')
		if (type) query = query.eq('type', type)

		const { data, error } = await query

		if (error) {
			this.setState({ error, loading: false })
			return
		}
		const mapped = data.map(item => {
			const sizes = item.product_sizes || []
			const hasStock = sizes.some(s => s.stock > 0)
			return {
				id: item.id,
				name: item.name,
				price: item.price_pln,
				img: item.image_url,
				sku: item.sku,
				oldPrice: null,
				discount: null,
				hasStock,
			}
		})

		this.setState({ data: mapped, loading: false })
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
		if (this.state.showAvailableOnly) {
			this.setState({ showAvailableOnly: false, visibleCount: visibleProductsCount })
			return
		}

		this.setState({ checkingAvailability: true })

		const candidates = this.state.data.filter(p => p.hasStock)
		const results = await Promise.all(
			candidates.map(async p => ({ product: p, hasPhoto: await this.checkImageExists(p.sku) }))
		)
		const available = results.filter(r => r.hasPhoto).map(r => r.product)

		this.setState({
			showAvailableOnly: true,
			availableProducts: available,
			checkingAvailability: false,
			visibleCount: visibleProductsCount
		})
	}

	render() {
		const { data, loading, error, showAvailableOnly, availableProducts, checkingAvailability } = this.state
		const source = showAvailableOnly ? availableProducts : data
		const visibleProducts = source.slice(0, this.state.visibleCount)

		return (
			<>
				<div className={css.products}>
					<div className={css.catalogWrapper}>
						<Link to="/" className={css.catalog_btn}>
							← Strona główna
						</Link>
						<h3 className={css.catalog_title}>Wszystkie produkty</h3>
						<button
							className={css.catalog_FilterBtn}
							onClick={this.handleToggleAvailable}
							disabled={checkingAvailability}
						>
							{checkingAvailability
								? 'Sprawdzanie...'
								: showAvailableOnly
									? 'Pokaż wszystkie'
									: 'Pokaż dostępne'}
						</button>
					</div>

					{loading && <p>Ładowanie produktów...</p>}
					{error && <p>Błąd wczytywania produktów: {error.message}</p>}
					{!loading && !error && showAvailableOnly && availableProducts.length === 0 && !checkingAvailability && (
						<p>Brak produktów z dostępnym rozmiarem i zdjęciem.</p>
					)}
					{!loading && !error && (!showAvailableOnly || availableProducts.length > 0) && (
						<>
							<CatalogGrid products={visibleProducts} />
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
						</>
					)}
				</div>
			</>
		)
	}
}
export default Catalog