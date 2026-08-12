import React from 'react'
import { useNavigate } from 'react-router-dom'
import css from '../Products/Products.module.css'

const PLACEHOLDER_IMG = 'https://placehold.co/400x400?text=Brand-Top'

function getProductImage(product) {
	if (product.img) return product.img // якщо image_url вже заповнений — пріоритет йому
	if (!product.sku) return PLACEHOLDER_IMG
	return `${import.meta.env.BASE_URL}image/${product.sku}.jpg`
}

export default function CatalogGrid({ products }) {
	const navigate = useNavigate()

	const handleCardClick = (product) => {
		navigate(`/product/${product.id}`)
	}

	return (
		<div className={css.products__list}>
			{products.map((product, index) => {
				const imgSrc = getProductImage(product)
				return (
					<div
						className={css.products__itemcard}
						key={product.id ?? index}
						onClick={() => handleCardClick(product)}
						role="button"
						tabIndex={0}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								handleCardClick(product)
							}
						}}
					>
						<div className={css.products__itemwrap}>
							<div className={css.products__imgwrap}>
								<img
									src={imgSrc}
									alt={product.name}
									loading='lazy'
									onError={e => {
										e.currentTarget.src = PLACEHOLDER_IMG
									}}
								/>
							</div>
							<div className={css.products__body}>
								{product.discount && (
									<span className={css.products__sale}>{product.discount}</span>
								)}
								<span className={css.products__name}>{product.name}</span>
								<span className={css.products__sub}></span>
								<div className={css.products__price}>
									{product.oldPrice && (
										<span className={css.old__price}>{product.oldPrice} zł</span>
									)}
									<span className={css.sale__price}>
										{product.price != null ? `${product.price} zł` : 'Cena wkrótce'}
									</span>
								</div>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}
