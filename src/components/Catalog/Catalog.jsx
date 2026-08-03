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
		filterPanelOpen: false
	}

	toggleFilterPanel = () => {
		this.setState(prev => ({ filterPanelOpen: !prev.filterPanelOpen }))
	}

	componentDidMount() {
		this.fetchProducts()
	}

	async fetchProducts() {
		const type = new URLSearchParams(window.location.search).get('type')

		let query = supabase.from('products').select('*')
		if (type) query = query.eq('type', type)

		const { data, error } = await query

		if (error) {
			this.setState({ error, loading: false })
			return
		}

		// приводим поля Supabase к форме, которую ждёт CatalogGrid
		const mapped = data.map(item => ({
			id: item.id,
			name: item.name,
			price: item.price_pln, // пока null — обработаем в CatalogGrid
			img: item.image_url, // пока null — обработаем в CatalogGrid
			oldPrice: null,
			discount: null
		}))

		this.setState({ data: mapped, loading: false })
	}

	render() {
		const { data, loading, error } = this.state
		const visibleProducts = data.slice(0, this.state.visibleCount)

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
							onClick={this.toggleFilterPanel}
						>
							Filtry
						</button>
					</div>

					{loading && <p>Ładowanie produktów...</p>}
					{error && <p>Błąd wczytywania produktów: {error.message}</p>}
					{!loading && !error && (
						<>
							<CatalogGrid products={visibleProducts} />
							{/* <CatalogGrid products={data} /> */}
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