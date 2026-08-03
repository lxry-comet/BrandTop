import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import css from './Favorites.module.css'

export class Favorites extends Component {
	state = {
		favoriteProducts: []
		// przykładowa struktura elementu:
		// { id, name, brand, img, price }
	}

	handleRemove = (index) => {
		this.setState((prev) => ({
			favoriteProducts: prev.favoriteProducts.filter((_, i) => i !== index)
		}))
	}

	handleAddToCart = (item) => {
		// TODO: podłączyć dodawanie do koszyka (CartContext / global state)
	}

	render() {
		const { favoriteProducts } = this.state
		const isEmpty = favoriteProducts.length === 0

		return (
			<div className={css.content}>
				<div className={css.page_header}>
					<Link to="/" className={css.back_btn}>
						← Strona główna
					</Link>
					<h2 className={css.section_title}>Ulubione</h2>
					<div className={css.header_placeholder}></div>
				</div>

				{isEmpty ? (
					<p className={css.empty_text}>Brak ulubionych produktów</p>
				) : (
					<>
						{favoriteProducts.map((item, index) => (
							<div className={css.fav_row} key={item.id ?? index}>
								<img
									src={item.img}
									alt={item.name}
									onError={(e) => {
										e.target.src = `https://placehold.co/60x60/1a1a1a/fff?text=${encodeURIComponent(
											item.brand ?? ''
										)}`
									}}
								/>
								<div className={css.fav_itemDetails}>
									<div className={css.fav_itemName}>{item.name}</div>
									<div className={css.fav_itemMeta}>{item.brand}</div>
								</div>
								<div className={css.fav_itemPrice}>{item.price} zł</div>
								<button
									className={css.btn_addCart}
									onClick={() => this.handleAddToCart(item)}
								>
									Do koszyka
								</button>
								<button
									className={css.rm_btn}
									onClick={() => this.handleRemove(index)}
								>
									✕
								</button>
							</div>
						))}
					</>
				)}
			</div>
		)
	}
}

export default Favorites
