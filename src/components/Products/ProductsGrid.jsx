import React from 'react'
import css from './Products.module.css'
import ProductCard from './ProductCard.jsx'

export default function ProductGrid({ products }) {
	return (
		<div className={css.products__list}>
			{products.map((product) => (
				<ProductCard product={product} key={product.id} />
			))}
		</div>
	)
}