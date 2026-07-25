import React, { Component } from 'react'

//? import json
import products from '@/json/products.json'

//? imports styles
import productsStyles from '../Products/Products.module.css'
import heroStyles from '../Hero/Hero.module.css'
//? imports components
import NewproductsGrid from './NewproductsGrid.jsx'

//? another elements

const css = { ...productsStyles, ...heroStyles };

const visibleProductsCount = 8

export class Newproducts extends Component {
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
							title='Nowości'
						>
							<img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1300&amp;h=400&amp;fit=crop&amp;auto=format" alt="Nowości" onerror="this.src='https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=1300&amp;h=400&amp;fit=crop'; this.style.minHeight='250px';"/>
							<div className={css.hero__bannertext}>Nowości</div>
						</a>
					</div>
					<NewproductsGrid products={visibleProducts} />
					<div className={css.products__btn}>Zobacz więcej</div>
				</div>
			</>
		)
	}
}
export default Newproducts
