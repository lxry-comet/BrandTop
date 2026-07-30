import React, { Component } from 'react'

//? import json
import products from '@/json/products.json'

//? imports styles
import productsStyles from '../Products/Products.module.css'
import heroStyles from '../Hero/Hero.module.css'
import catalogStyles from './Catalog.module.css'
//? imports components
import CatalogGrid from './CatalogGrid.jsx'

//? another elements

const css = { ...productsStyles, ...heroStyles, ...catalogStyles }

const visibleProductsCount = 8

export class Catalog extends Component {
	state = {
		data: products
	}

	render() {
		const visibleProducts = this.state.data.slice(0, visibleProductsCount)

		return (
			<>
				<div className={css.products}>
					<div className={css.catalogWrapper}>
						<button 
							className={css.catalog_btn} 
							onclick="navTo('home')"
						>
							← Strona główna
						</button>
						<h3 
							className={css.catalog_title} 						
							>
							Wszystkie produkty
						</h3>
						<button class={css.catalog_FilterBtn} onclick='toggleFilterPanel()'>
							Filtry
						</button>
					</div>
					<CatalogGrid products={visibleProducts} />
					<div className={css.products__btn}>Zobacz więcej</div>
				</div>
			</>
		)
	}
}
export default Catalog
