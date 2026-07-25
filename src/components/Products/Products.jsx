import React, { Component } from 'react'

//? import json 
import products from '@/json/products.json'

//? imports styles
import css from './Products.module.css'

//? imports components
import ProductGrid from './ProductsGrid.jsx'

//? another elements
const visibleProductsCount = 8;

export class Products extends Component {
	state = {
		data: products
	}

	render() {

		const visibleProducts = this.state.data.slice(0, visibleProductsCount)

		return (
			<>
				<div className={css.products}>
					
					<ProductGrid products={visibleProducts}/>
					<div className={css.products__btn}>
						Zobacz więcej
					</div>
				</div>
			</>
		)
	}
}
export default Products
