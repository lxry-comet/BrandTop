import React, { Component } from 'react'

//? import json
import products from '@/json/products.json'

//? imports styles
import productsStyles from '../Products/Products.module.css'
import heroStyles from '../Hero/Hero.module.css'
//? imports components
import BestsellersGrid from './BestsellersGrid.jsx'

//? another elements

const css = { ...productsStyles, ...heroStyles };

const visibleProductsCount = 8

export class Bestsellers extends Component {
	state = {
		data: products
	}

	render() {
		const visibleProducts = this.state.data.slice(0, visibleProductsCount)

		return (
			<>
				<div className={css.products}>
					<div className={css.hero__bannerwrap}>
						<a
							className={css.hero__bannerlink}
							onclick='goToSaleCatalog()'
							title='Hity sprzedaży'
						>
							<img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1300&amp;h=400&amp;fit=crop" alt="Hity sprzedaży" onerror="this.style.background='#333'; this.style.minHeight='250px';"/>
							<div className={css.hero__bannertext}>Hity sprzedaży</div>
						</a>
					</div>
					<BestsellersGrid products={visibleProducts} />
					<div className={css.products__btn}>Zobacz więcej</div>
				</div>
			</>
		)
	}
}
export default Bestsellers
