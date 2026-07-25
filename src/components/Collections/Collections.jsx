import React, { Component } from 'react'

//? import json
import products from '@/json/products.json'

//? imports styles
import productsStyles from '../Products/Products.module.css'
import heroStyles from '../Hero/Hero.module.css'
//? imports components
import CollectionsGrid from './CollectionsGrid.jsx'

//? another elements

const css = { ...productsStyles, ...heroStyles };

const visibleProductsCount = 8

export class Collections extends Component {
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
							title='Kolekcje'
						>
							<img
								src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1300&h=400&fit=crop"
								alt='Kolekcje'
								onerror="this.style.background='#333'; this.style.minHeight='250px';"
							/>
							<div className={css.hero__bannertext}>Kolekcje</div>
						</a>
					</div>
					<CollectionsGrid products={visibleProducts} />
					<div className={css.products__btn}>Zobacz więcej</div>
				</div>
			</>
		)
	}
}
export default Collections
